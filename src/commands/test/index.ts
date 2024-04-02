import { Command } from '@oclif/core'
import { AwsConfig } from '../../config'

export class Init extends Command {
  static description = 'Test'

  async run (): Promise<void> {
    await AwsConfig.save(true)
  }
}
