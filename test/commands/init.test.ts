// import { runCommand } from '@oclif/test'
// import { expect } from 'chai'
// import { dirname, join } from 'node:path'
// import { describe } from 'node:test'
// import { fileURLToPath } from 'node:url'
// // import { render } from '@inquirer/testing'
// import mock from 'mock-fs'
// import { stdin as fstdin } from 'mock-stdin'
// import { userInfo } from 'node:os'

// const _dirname = dirname(fileURLToPath(import.meta.url))
// const root = join(_dirname, '..', '..')
// const src = join(root, 'src')
// const stdin = fstdin()

// mock({
//   'package.json': mock.load(join(root, 'package.json')),
//   node_modules: mock.load(join(root, 'node_modules')),
//   [src]: mock.load(src, { lazy: true, recursive: true }),
//   [`/home/${userInfo().username}/.aws/`]: {}
// })

// // inquirer
// describe('interactive', () => {

// })

// // oclif
// // describe('command:init', () => {
// //   it('runs init', async () => {
// //     const { error, result, stderr, stdout } = await runCommand('login', { root })
// //     // of course, this won't work because the test fails before this due to it hanging waiting for user input
// //     stdin.send('\n')
// //     expect(result).to.equal(true)
// //   })
// // })

// describe('command:new:sso-profile', () => {
//   const prefilledArgs = [
//     '--sso-profile-name', 'test-profile',
//     '--sso-start-url', 'https://example.com',
//     '--sso-region', 'us-west-2',
//     '--sso-account-id', '1234567890',
//     '--sso-role-name', 'test-role'
//   ]
//   it('skips if all args provided', async () => {
//     const { error, result, stderr, stdout } = await runCommand(['new:sso-profile', ...prefilledArgs], { root })
//     expect(result).to.equal(true)
//   })
// })
