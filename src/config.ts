import select from '@inquirer/select'
import { getHomeDir, getProfileName, loadSsoSessionData, parseKnownFiles } from '@smithy/shared-ini-file-loader'
import { IniSectionType, type ParsedIniData } from '@smithy/types'
import chalk from 'chalk'
import { highlight } from 'cli-highlight'
import { createPatch } from 'diff'
import fs from 'fs/promises'
import { stringify } from 'ini'
import { join } from 'path'
import { type AwsConfigSectionTypeProfile, type AwsConfigSectionTypeSsoSession } from './aws-config-types'
import log from './log'
import { bak } from './utils'

/**
 * When instantiated, reads all available AWS config files.
 * Assumes we're running on an end-users system that has AWS CLI installed.
 * Some elements can be modified and written back to the config files.
 */
export class AwsConfigClass {
  private static instance: AwsConfigClass
  static iniOpts: Parameters<typeof stringify>[1] = {
    whitespace: true,
    align: false,
    sort: true,
    newline: false
  }

  /**
   * Path to the AWS config file, usually ~/.aws/config
   * The package @smithy/shared-ini-file-loader doesn't expose the getConfigFilepath function,
   *  so this is a replication of it
   */
  readonly awsConfigFilePath = process.env.AWS_CONFIG_FILE ?? join(getHomeDir(), '.aws', 'config')
  /**
   * All profiles/sessions in the shared config files
   */
  private parsedConfig!: ParsedIniData
  /**
   * All IniSection objects that match the InitSectionType.SSO_SESSION type
   */
  ssoSessions: Record<string, AwsConfigSectionTypeSsoSession> = {}

  /**
   * The name of the current profile, if any
   */
  currentProfile = getProfileName({})
  /**
   * All IniSection objects that match the InitSectionType.SERVICES type
   */
  services: ParsedIniData = {}

  /**
   * All IniSection objects that match the InitSectionType.PROFILE type
   */
  profiles: Record<string, AwsConfigSectionTypeProfile> = {}

  constructor () {
    if (AwsConfigClass.instance) {
      return AwsConfigClass.instance
    }
    AwsConfigClass.instance = this
  }

  /**
   * Load all available AWS config files
   * @returns this instance of AwsConfigClass
   */
  async load (): Promise<this> {
    this.ssoSessions = await loadSsoSessionData({}) as unknown as Record<string, AwsConfigSectionTypeSsoSession>
    log.debug('Loaded SSO session data:', JSON.stringify(this.ssoSessions))
    log.verbose(`User has ${Object.keys(this.ssoSessions).length} SSO session(s) defined: ${Object.keys(this.ssoSessions).join(', ')}`)

    this.parsedConfig = await parseKnownFiles({})

    this.services = Object.fromEntries(
      Object.entries(this.parsedConfig)
        .filter(([key]) => key.startsWith(`${IniSectionType.SERVICES}.`))
        .map(([key, value]) => [key.split(`${IniSectionType.SERVICES}.`)[1], value])
    )
    log.debug('Loaded services:', JSON.stringify(this.services))
    log.verbose(`User has ${Object.keys(this.services).length} services defined: ${Object.keys(this.services).join(', ')}`)

    this.profiles = Object.fromEntries(
      Object.entries(this.parsedConfig)
        // sso-session and services both get prefixes in the parsed config, but profiles don't
        // so after filtering out those, we can assume anything left is a profile
        .filter(([key]) => !key.startsWith(`${IniSectionType.SERVICES}.`))
        .filter(([key]) => !key.startsWith(`${IniSectionType.SSO_SESSION}.`))
    )
    log.debug('Loaded profiles:', JSON.stringify(this.profiles))
    log.verbose(`User has ${Object.keys(this.profiles).length} profiles defined: ${Object.keys(this.profiles).join(', ')}`)

    return this
  }

  /**
   * Renders this instance of AwsConfigClass as a (hopefully) valid AWS config file ini
   * @param iniOpts Options to pass to the ini package when stringifying the config
   * @returns The rendered ini file as a string
   */
  renderFullIni (iniOpts = AwsConfigClass.iniOpts): string {
    return [
      this.renderIniSection(IniSectionType.SSO_SESSION, iniOpts),
      this.renderIniSection(IniSectionType.SERVICES, iniOpts),
      this.renderIniSection(IniSectionType.PROFILE, iniOpts)
    ].join('\n')
  }

  /**
   * Prefixes all keys in the given data object with the given prefix
   * @param data The data object with keys to prefix
   * @param prefix The prefix to add to all keys
   * @returns A new object with all keys prefixed
   */
  private prefixKeys<T = unknown>(data: Record<string, T>, prefix: string): Record<string, T> {
    return Object.fromEntries(
      Object.entries(data)
        .map(([key, value]) => [`${prefix} ${key}`, value])
    )
  }

  /**
   * Renders a specific section of this instance of AwsConfigClass as a (hopefully) valid AWS config file ini
   * @param type The type of section to render
   * @param iniOpts Options to pass to the ini package when stringifying the config
   * @returns The rendered ini section as a string
   */
  renderIniSection (type: IniSectionType, iniOpts = AwsConfigClass.iniOpts): string {
    if (type === IniSectionType.SSO_SESSION) {
      return this.objectToIni(this.prefixKeys(this.ssoSessions, IniSectionType.SSO_SESSION), iniOpts)
    } else if (type === IniSectionType.SERVICES) {
      // Services is a bit weird
      return this.renderServicesIniSection(this.prefixKeys(this.services, IniSectionType.SERVICES), iniOpts)
    } else {
      return this.objectToIni(this.prefixKeys(this.profiles, IniSectionType.PROFILE), iniOpts)
    }
  }

  /**
   * The services section of the config file is a bit unique and requires some special handling.
   * TODO I don't actually know if this is correct, as I don't use it, but it looks correct based on their docs.
   * Also this function is pretty ugly to work around the default formatting for the ini package
   * @see https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#:~:text=automatic%20authentication%20refresh.-,section%20type%3A%20services,-The%20services%20section
   * @param data
   * @param iniOpts Options to pass to the ini package when stringifying the config
   * @returns The rendered 'services' ini section as a string
   */
  private renderServicesIniSection (data: Record<string, any>, iniOpts = AwsConfigClass.iniOpts): string {
    const services = Object.fromEntries(Object.entries(structuredClone(this.services))
      .map(([key, value]) => {
        return [key, Object.fromEntries(Object.entries(value).map(([serviceKey, serviceValue]) => {
          const keys = serviceKey.split('.')
          return [keys[0] + ' =\n\t' + keys[1], serviceValue]
        }))]
      }))
    return this.objectToIni(services, iniOpts)
  }

  /**
   * Converts the given object to an ini section string
   * @param input The ParsedIniData object to convert
   * @param iniOpts Options to pass to the ini package when stringifying the config
   * @returns The rendered ini section as a string
   */
  objectToIni (input: Record<any, any>, iniOpts = AwsConfigClass.iniOpts): string {
    return stringify(input, iniOpts)
  }

  printObjectAsIni (input: Record<any, any>, iniOpts = AwsConfigClass.iniOpts): void {
    const rendered = this.objectToIni(input, iniOpts)
    log.debug(rendered)
    console.log(highlight(rendered, { language: 'ini' }))
  }

  /**
   * Renders the full ini file and logs it to the console highlighted
   * @param iniOpts Options to pass to the ini package when stringifying the config
   */
  printFullIni (iniOpts = AwsConfigClass.iniOpts): void {
    const rendered = this.renderFullIni(iniOpts)
    log.debug(JSON.stringify(rendered))
    console.log(highlight(rendered, { language: 'ini' }))
  }

  /**
   * Renders a specific section of the ini file and logs it to the console highlighted
   * @param type The type of section to render
   * @param iniOpts Options to pass to the ini package when stringifying the config
   */
  printIniSection (type: IniSectionType, iniOpts = AwsConfigClass.iniOpts): void {
    const rendered = this.renderIniSection(type, iniOpts)
    log.debug(JSON.stringify(rendered))
    console.log(highlight(rendered, { language: 'ini' }))
  }

  addIniSection (type: IniSectionType, data: Record<string, AwsConfigSectionTypeSsoSession | AwsConfigSectionTypeProfile | Record<string, string | undefined>>): void {
    if (type === IniSectionType.SSO_SESSION) {
      this.ssoSessions = { ...this.ssoSessions, ...data } as Record<string, AwsConfigSectionTypeSsoSession>
    } else if (type === IniSectionType.SERVICES) {
      this.services = { ...this.services, ...data } as ParsedIniData
    } else {
      this.profiles = { ...this.profiles, ...data } as Record<string, AwsConfigSectionTypeProfile>
    }
  }

  async save (ask = false): Promise<boolean> {
    log.debug('Starting save...')
    if (ask) {
      log.debug('Asking user if they want to save changes...')
      while (true) {
        const answer = await select<boolean | string>({
          message: 'Would you like to save the changes to the AWS config file?\n' + chalk.grey('(We will back up the existing file before saving. Answering no will discard changes)'),
          choices: [
            {
              name: 'Save Changes',
              value: true
            }, {
              name: 'Discard Changes',
              value: false
            }, {
              name: 'Show Diff',
              value: 'diff'
            }, {
              name: 'Print Whole Config',
              value: 'print'
            }
          ]
        })
        if (answer === 'print') {
          log.debug('Printing full ini file')
          this.printFullIni()
        } else if (answer === 'diff') {
          log.debug('Showing diff of changes')
          const rawAwsConfigFile = await fs.readFile(this.awsConfigFilePath)
          const diff = createPatch('config', rawAwsConfigFile.toString(), this.renderFullIni(), undefined, undefined, { ignoreWhitespace: true })
          log.info(highlight(diff, { language: 'diff', languageSubset: ['ini'] }))
        } else if (answer === false) {
          log.debug('User chose to discard changes')
          return false
        } else {
          break
        }
      }
    }
    // Make a backup of the existing config file
    await bak(this.awsConfigFilePath)
    try {
      log.verbose('Saving changes to AWS config file at', chalk.cyan.bold(this.awsConfigFilePath))
      await fs.writeFile(this.awsConfigFilePath, this.renderFullIni())
    } catch (e) {
      log.error('Error saving changes to AWS config file:', e)
      return false
    }
    log.info('Saved changes to AWS config file at', chalk.cyan.bold(this.awsConfigFilePath))
    return true
  }
}

export const AwsConfig = await new AwsConfigClass().load()

// export interface IAwshiftConfig {
//   defaultSsoSessionProfile: string
// }

// export const AwshiftConfig = convict<IAwshiftConfig>({
//   defaultSsoSessionProfile: {
//     doc: 'The name of the default SSO session to use for all commands (Created during awshift init)',
//     format: String,
//     env: 'AWSHIFT_DEFAULT_SSO_SESSION_PROFILE',
//     default: 'default'
//   }
// }).loadFile(join(dirname(AwsConfig.awsConfigFilePath), 'awshift.json5'))
//   .validate({ output: log.warn })
