/*
  These are all transcribed from https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#cli-configure-files-settings
  I was too lazy to include them all and format the docs from there properly.
  Open an issue if I got something wrong.
*/

import { ParsedIniData } from "@smithy/types"

export interface AwsConfigSectionTypeProfile {
  aws_access_key_id?: string
  aws_secret_access_key?: string
  aws_session_token?: string
  ca_bundle?: string
  cli_auto_prompt?: 'on' | 'on-partial'
  cli_binary_format?: 'base64' | 'raw-in-base64-out'
  cli_history?: 'enabled' | 'disabled'
  cli_pager?: string
  cli_timestamp_format?: string
  credential_process?: string
  credential_source?: string
  duration_seconds?: number
  endpoint_url?: string
  ignore_configure_endpoint_urls?: boolean
  external_id?: string
  max_attempts?: number
  mfa_serial?: string
  output?: 'json' | 'yaml' | 'yaml-stream' | 'text' | 'table'
  parameter_validation?: boolean
  region?: string
  retry_mode?: 'legacy' | 'standard'
  role_arn?: string
  role_session_name?: string
  services?: string
  source_profile?: string
  use_dualstack_endpoint?: boolean
  use_fips_endpoint?: boolean
  web_identity_token_file?: string
  tcp_keepalive?: boolean
  s3?: string
}

export interface AwsConfigSectionTypeSsoSession extends AwsConfigSectionTypeProfile {
  /**
   * Specifies the URL that points to the organization's AWS access portal. The AWS CLI uses this URL to establish a session with the IAM Identity Center service to authenticate its users. To find your AWS access portal URL, use one of the following:
   * - Open your invitation email, the AWS access portal URL is listed.
   * - Open the AWS IAM Identity Center console at https://console.aws.amazon.com/singlesignon/
   * The AWS access portal URL is listed in your settings.
   * This setting does not have an environment variable or command line option.
   * @example https://my-sso-portal.awsapps.com/start
   */
  sso_start_url: string
  /**
   * Specifies the AWS Region that contains the AWS access portal host. This is separate from, and can be a different Region than the default CLI region parameter.
   * This setting does not have an environment variable or command line option.
   * @example us-west-2
   */
  sso_region: string
  /**
   * Specifies the AWS account ID that contains the IAM role with the permission that you want to grant to the associated IAM Identity Center user.
   * This setting does not have an environment variable or command line option.
   * @example 123456789012
   */
  sso_account_id?: string
  /**
   * Specifies the friendly name of the IAM role that defines the user's permissions when using this profile.
   * This setting does not have an environment variable or command line option.
   * @example ReadAccess
   */
  sso_role_name?: string
  /**
   * A comma-delimited list of scopes to be authorized for the sso-session. Scopes authorize access to IAM Identity Center bearer token authorized endpoints.
   * A valid scope is a string, such as sso:account:access. This setting isn't applicable to the legacy non-refreshable configuration.
   * This setting does not have an environment variable or command line option.
   * @example sso:account:access
   */
  sso_registration_scopes?: string
}

export type AwsConfigSectionTypeServices = Record<string, unknown>
