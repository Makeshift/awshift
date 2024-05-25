import { confirm, input } from '@inquirer/prompts'
import { Command, Flags } from '@oclif/core'
import { IniSectionType } from '@smithy/types'
import chalk from 'chalk'
import { AwsConfig } from '../../../config'
import log from '../../../log'
import { FlexibleQuestion, FlexibleQuestionSet } from '../../../questions'

export const createNewSsoProfileQuestions = new FlexibleQuestionSet({
  'sso-profile-name': new FlexibleQuestion<string>({
    arg: Flags.string({
      summary: "The name of the new SSO session configuration we'll insert into your AWS config file (env: AWSHIFT_NEW_SSO_PROFILE_NAME)",
      env: 'AWSHIFT_NEW_SSO_PROFILE_NAME'
    }),
    skipIfAnswerExists: true,
    ask: async (defaultValue) => await input({
      message: 'Enter a name for the new SSO session configuration\n' + chalk.grey('(This will be its name in your AWS config file)'),
      default: defaultValue
    })
  }),
  'sso-start-url': new FlexibleQuestion<string>({
    arg: Flags.string({
      summary: 'The URL to start the SSO process (env: AWSHIFT_NEW_SSO_START_URL)',
      env: 'AWSHIFT_NEW_SSO_START_URL'
    }),
    skipIfAnswerExists: true,
    ask: async (defaultValue, validateFn) => await input({
      message: 'Enter the SSO start URL\n' + chalk.grey('Example: https://my-sso-portal.awsapps.com/start'),
      default: defaultValue,
      validate: validateFn
    }),
    validate: (input) => {
      if (!input.startsWith('https://')) {
        return 'URL must start with https://'
      }
      return true
    }
  }),
  'sso-region': new FlexibleQuestion<string>({
    arg: Flags.string({
      summary: 'The region where your SSO portal is hosted (env: AWSHIFT_NEW_SSO_REGION)',
      env: 'AWSHIFT_NEW_SSO_REGION'
    }),
    skipIfAnswerExists: true,
    ask: async (defaultValue) => await input({
      message: 'Enter the SSO region\n' + chalk.grey('Example: eu-west-1'),
      default: defaultValue
    })
  }),
  'sso-account-id': new FlexibleQuestion<string>({
    arg: Flags.string({
      summary: 'The SSO account ID (env: AWSHIFT_NEW_SSO_ACCOUNT_ID)',
      env: 'AWSHIFT_NEW_SSO_ACCOUNT_ID'
    }),
    skipIfAnswerExists: true,
    ask: async (defaultValue) => await input({
      message: 'Enter the SSO account ID\n' + chalk.grey('(Optional - hit enter to skip)'),
      default: defaultValue
    })
  }),
  'sso-role-name': new FlexibleQuestion<string>({
    arg: Flags.string({
      summary: 'The SSO role name (env: AWSHIFT_NEW_SSO_ROLE_NAME)',
      env: 'AWSHIFT_NEW_SSO_ROLE_NAME'
    }),
    skipIfAnswerExists: true,
    ask: async (defaultValue) => await input({
      message: 'Enter the SSO role name\n' + chalk.grey('(Optional - hit enter to skip)'),
      default: defaultValue
    })
  })
})

const looksGoodQuestion = new FlexibleQuestion({
  arg: Flags.boolean<boolean>({
    char: 'y',
    description: 'Skip confirmation prompts (env: AWSHIFT_YES)',
    env: 'AWSHIFT_YES'
  }),
  skipIfAnswerExists: true,
  ask: async (defaultValue) => await confirm({
    message: 'Does this look good?',
    default: defaultValue
  })
})

export class SetupNewSsoProfile extends Command {
  static flags = {
    ...createNewSsoProfileQuestions.flags,
    yes: looksGoodQuestion.arg
  }

  static description = 'Guides you through setting up a new SSO session configuration in your AWS config file'

  async run (): Promise<string> {
    log.info(chalk.cyan.bold('New SSO session configuration:\n') + chalk.grey('(You can probably get this info from your friendly neighborhood AWS admin)'))
    const { flags } = await this.parse(SetupNewSsoProfile)
    const results = await createNewSsoProfileQuestions.resolve(flags)
    const { ssoProfileName, ...newSsoSession } = results

    log.info('New SSO session configuration:')
    const asIniSection = {
      [ssoProfileName]: newSsoSession
    }
    AwsConfig.printObjectAsIni(asIniSection)

    if (await confirm({
      message: 'Does this look good?',
      default: true
    })) {
      log.verbose('User confirmed new SSO session configuration')
      AwsConfig.addIniSection(IniSectionType.SSO_SESSION, asIniSection)
      if (!await AwsConfig.save(true)) {
        log.error('Failed to save new SSO session configuration to AWS config file')
        if (await confirm({
          message: 'Do you want to try again?',
          default: true
        })) {
          return await this.run()
        }
        throw new Error('Failed to save new SSO session configuration to AWS config file')
      }
    } else {
      log.verbose('User did not confirm new SSO session configuration, starting over')
      return await this.run()
    }
    return ssoProfileName
  }
}
