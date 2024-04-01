import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import select from '@inquirer/select'
import { Command } from '@oclif/core'
import { IniSectionType } from '@smithy/types'
import chalk from 'chalk'
import { type AwsConfigSectionTypeSsoSession } from '../../aws-config-types'
import { AwsConfig } from '../../config'
import log from '../../log'

interface InitAnswers {
  primarySsoSessionName: string
  primarySsoSession: AwsConfigSectionTypeSsoSession
}

export class Init extends Command {
  static description = 'Perform initial setup and generate configuration'

  answers: InitAnswers = {} as InitAnswers

  async setupPrimarySso (): Promise<void> {
    if (Object.keys(AwsConfig.ssoSessions).length) {
      log.verbose('User has existing SSO session config')
      log.info(chalk.cyan.bold('Existing SSO session configurations:'))
      AwsConfig.printIniSection(IniSectionType.SSO_SESSION)

      if (await confirm({
        message: 'You appear to have existing SSO session configurations. Would you like re-use them?\n' + chalk.grey('(Answering no will clear existing SSO configurations)'),
        default: true
      })) {
        log.verbose('User chose to re-use existing SSO session configuration')

        if (Object.keys(AwsConfig.ssoSessions).length > 1) {
          this.answers.primarySsoSessionName = await select({
            message: 'awshift init can only configure one SSO session at a time. Which one would you like to configure now?',
            choices: Object.keys(AwsConfig.ssoSessions).map((name) => {
              return {
                name,
                value: name
              }
            })
          })
        } else {
          this.answers.primarySsoSessionName = Object.keys(AwsConfig.ssoSessions)[0]
        }
        this.answers.primarySsoSession = AwsConfig.ssoSessions[this.answers.primarySsoSessionName] as unknown as AwsConfigSectionTypeSsoSession
      } else {
        log.verbose('User chose not to re-use existing SSO session configuration. Clearing loaded config.')
        AwsConfig.ssoSessions = {}
        this.answers.primarySsoSessionName = await input({
          message: 'Enter a name for the new SSO session configuration'
        })
        log.info(chalk.cyan.bold('Primary SSO session configuration:'))
        this.answers.primarySsoSession = {
          sso_start_url: await input({
            message: 'Enter the SSO start URL'
          }),
          sso_region: await input({
            message: 'Enter the SSO region'
          }),
          sso_account_id: await input({
            message: 'Enter the SSO account ID\n' + chalk.grey('(Optional - hit enter to skip)'),
            default: ''
          }),
          sso_role_name: await input({
            message: 'Enter the SSO role name\n' + chalk.grey('(Optional - hit enter to skip)'),
            default: ''
          }),
          sso_registration_scopes: await input({
            message: 'Enter the SSO registration scopes\n' + chalk.grey('(Optional - hit enter to skip)'),
            default: ''
          })
        }
      }
    }
    AwsConfig.addIniSection(IniSectionType.SSO_SESSION, { [this.answers.primarySsoSessionName]: this.answers.primarySsoSession })
    log.debug('Primary SSO session:', JSON.stringify(this.answers.primarySsoSession))
  }

  async run (): Promise<void> {
    log.verbose('Running init command')
    await this.setupPrimarySso()
  }
}