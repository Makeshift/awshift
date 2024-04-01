# awshift

A small CLI app designed to help manage AWS SSO credentials for multiple accounts.

## Features

**Core**:

- [ ] Log in to AWS SSO
- [ ] Generate ~/.aws/config for SSO session
- [ ] Generate profiles with selectable roles for each account
- [ ] Easy to edit config file with the above settings
- [ ] Support refreshing legacy credentials (a la [yawsso](https://github.com/victorskl/yawsso))
- [ ] Easy profile switching

**Optional Extras**:

- [ ] Generate EKS cluster configs for each account
- [ ] Log in to ECR in each account
- [ ] Log in to CodeArtifact
- [ ] CLI autocomplete

## Dependencies

### For usage

- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- a Node.js runtime, eg. [Node.js](https://nodejs.org/en/download) 18+ or [Bun](https://bun.sh/) 1.0+
- a Node.js package manager, eg. NPM, [Yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/), or [Bun](https://bun.sh/)

### For development

Any combination of the above 'for usage' dependencies should be sufficient.

## Installation

### From package manager

TODO

### From source

```bash
git clone https://github.com/Makeshift/awshift.git
cd awshift
yarn install
```

## Usage

TODO
