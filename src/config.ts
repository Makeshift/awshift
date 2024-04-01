import { getHomeDir, getProfileName, loadSsoSessionData, parseKnownFiles } from '@smithy/shared-ini-file-loader'
import { IniSectionType, type ParsedIniData } from '@smithy/types'
import { highlight } from 'cli-highlight'
import { stringify } from 'ini'
import { join } from 'path'
import { type AwsConfigSectionTypeProfile, type AwsConfigSectionTypeSsoSession } from './aws-config-types'
import log from './log'

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
  private prefixKeys<T = unknown> (data: Record<string, T>, prefix: string): Record<string, T> {
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
      return this.objectToIni(this.prefixKeys(this.services, IniSectionType.SERVICES), iniOpts)
    } else {
      return this.objectToIni(this.prefixKeys(this.profiles, IniSectionType.PROFILE), iniOpts)
    }
  }

  /**
   * Converts the given object to an ini section string
   * @param input The ParsedIniData object to convert
   * @param iniOpts Options to pass to the ini package when stringifying the config
   * @returns The rendered ini section as a string
   */
  objectToIni (input: Record<string, unknown>, iniOpts = AwsConfigClass.iniOpts): string {
    return stringify(input, iniOpts)
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

  addIniSection (type: IniSectionType, data: Record<string, unknown>): void {
    if (type === IniSectionType.SSO_SESSION) {
      this.ssoSessions = { ...this.ssoSessions, ...data } as Record<string, AwsConfigSectionTypeSsoSession>
    } else if (type === IniSectionType.SERVICES) {
      this.services = { ...this.services, ...data } as ParsedIniData
    } else {
      this.profiles = { ...this.profiles, ...data } as Record<string, AwsConfigSectionTypeProfile>
    }
  }
}

export const AwsConfig = await new AwsConfigClass().load()
