import select, { Separator } from '@inquirer/select'
import { Command } from '@oclif/core'
import { IniSectionType } from '@smithy/types'
import chalk from 'chalk'
import { AwsConfig } from '../../config'
import log from '../../log'
import { createNewSsoProfileQuestions, SetupNewSsoProfile } from '../new/sso-profile'

/**
 * The init command is used to perform initial setup and generate configuration used
 * to retrieve AWS credentials.
 */
export class Init extends Command {
  static description = 'Perform initial setup and generate configuration'

  flags = {
    ...createNewSsoProfileQuestions.flags
  }

  async hasExistingSsoSessionConfig (): Promise<string> {
    log.verbose('User has existing SSO session config')
    log.info(chalk.cyan.bold('Existing SSO session configurations:'))
    AwsConfig.printIniSection(IniSectionType.SSO_SESSION)

    // Ask the user if they want to re-use one, or clear them all.
    const existingOptions = Object.entries(AwsConfig.ssoSessions).map(([name, value]) => {
      return {
        name,
        value: name,
        description: chalk.grey(value.sso_start_url)
      }
    })
    const specialOptions = {
      clearAll: Symbol('Clear all existing SSO session configurations'),
      addNew: Symbol('Add a new SSO session configuration')
    }
    const reUseExisting = await select<string | symbol>({
      message: 'You appear to have existing SSO session configurations.\nAwshift can work with multiple configurations, but init is done with one SSO session configuration at a time.\nPick the one you would like to init now.\n' + chalk.grey("(Answering 'Clear' will clear all existing SSO configurations)"),
      choices: [
        ...existingOptions,
        new Separator(),
        {
          name: 'New',
          description: 'Add a new SSO session configuration',
          value: specialOptions.addNew
        },
        {
          name: 'Clear',
          description: 'Clear all existing SSO session configurations and add a new one',
          value: specialOptions.clearAll
        }
      ]
    })

    if (reUseExisting === specialOptions.clearAll || reUseExisting === specialOptions.addNew) {
      if (reUseExisting === specialOptions.clearAll) {
        log.verbose('User chose to clear existing SSO session configurations')
        AwsConfig.ssoSessions = {}
      }
      log.verbose('User chose to add a new SSO session configuration')
      return await this.createNewSsoProfile()
    } else if (typeof reUseExisting === 'string') {
      log.verbose('User chose to re-use existing SSO session configuration', reUseExisting)
      return reUseExisting
    }
    return await this.hasExistingSsoSessionConfig()
  }

  async createNewSsoProfile (): Promise<string> {
    return await SetupNewSsoProfile.run(this.argv)
  }

  async run (): Promise<void> {
    log.verbose('Running init command')
    let selectedSsoProfile: string
    if (Object.keys(AwsConfig.ssoSessions).length) {
      selectedSsoProfile = await this.hasExistingSsoSessionConfig()
    } else {
      selectedSsoProfile = await this.createNewSsoProfile()
    }
    log.info('Selected SSO profile:', selectedSsoProfile)
  }
}
