// import { SSOClient, ListAccountsCommand } from '@aws-sdk/client-sso'
// import { fromSSO } from '@aws-sdk/credential-providers'

// const client = new SSOClient({
//   credentials: fromSSO({
//     ignoreCache: true,
//     profile
//   })
// })

// export async function listAccounts(profileName: string): Promise<void> {
//   const command = new ListAccountsCommand({})
//   // const response = await client.send(command)
//   // console.log(response)
//   console
// }

import { Command } from '@oclif/core'

export class Init extends Command {
  static description = 'Placeholder'

  async run (): Promise<void> {
    throw new Error('Not implemented')
  }
}
