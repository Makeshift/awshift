import { SSOClient as AwsSSOClient } from '@aws-sdk/client-sso'

export class SSOClient extends AwsSSOClient {
  private static readonly instance: SSOClient
  constructor (...args: ConstructorParameters<typeof AwsSSOClient>) {
    if (SSOClient.instance) {
      return SSOClient.instance
    }
    super(...args)
  }
}
