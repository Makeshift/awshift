import { constants, copyFile } from 'fs/promises'
import { getSystemErrorMap } from 'node:util'
import log from './log'

/**
 * Creates a backup of a file by copying it to a new file with a .bak suffix
 * If the file already exists, it will try up to 20 times with an incrementing suffix, eg .bak1
 * If the file doesn't exist, will simply return
 * @param path The path to the file to back up
 * @returns void
 */
export async function bak (path: string): Promise<void> {
  let attempt = 1
  // I mean, if you've tried 20 times and it still hasn't worked, it's probably not going to work
  while (attempt < 20) {
    const bakFileName = `${path}.bak${attempt === 1 ? '' : attempt}`
    try {
      log.debug(`Attempting to create backup ${path} -> ${bakFileName} (attempt ${attempt})`)
      await copyFile(path, bakFileName, constants.COPYFILE_EXCL)
      return
    } catch (e: unknown) {
      if (isSystemError(e)) {
        log.debug(`Failed to create backup ${path} -> ${bakFileName} (attempt ${attempt}) due to error: ${e.message} (${e.code})`)
        if (e.code === 'EEXIST') {
          log.debug(`${bakFileName} already exists, trying again`)
          attempt++
        } else if (e.code === 'ENOENT') {
          // Non-fatal error - Having nothing to back up is fine
          log.verbose(`Failed to create backup ${path} -> ${bakFileName} (attempt ${attempt}) due to file being missing: ${e.message} (${e.code})`)
          return
        } else {
          // Fatal error, make better system error handling
          log.error(`Failed to create backup ${path} -> ${bakFileName} (attempt ${attempt}) due to unhandled system error: ${e.message} (${e.code})`)
          throw e
        }
      } else {
        // Very fatal error, we don't even know what this is
        log.error(`Failed to create backup ${path} -> ${bakFileName} (attempt ${attempt}) due to unknown error: ${e as string}`)
        throw e
      }
    }
    log.info(`Created backup of ${path} -> ${bakFileName}`)
  }
  // This should be unreachable, but just in case
  log.error(`Failed to create backup of ${path} after 20 attempts`)
  throw new Error(`Failed to create backup of ${path} after 20 attempts`)
}

/**
 * Checks if an error is a system error as defined by NodeJS.ErrnoException (used by fs/promises)
 * @param error The error to check
 * @returns boolean
 */
function isSystemError (error: unknown): error is NodeJS.ErrnoException {
  if (!(error instanceof Error) || !Object.hasOwn(error, 'errno')) {
    return false
  }

  const { errno } = <typeof error & { errno: unknown }>error

  return typeof errno === 'number' && getSystemErrorMap().has(errno)
}

/**
 * This type is useful for debugging. If you want to see what a type resolves to, you can use this type to get the type of the type.
 * @example export type MyType = Expand<SomeType>
 * You can then hover over MyType to see what SomeType resolves to.
 * @template T The type to expand
 */
export type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
    ? { [K in keyof O]: O[K] }
    : never

/**
 * Like Expand, but expands recursively.
 * @template T The type to expand
 */
export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
  ? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
  : T extends object
    ? T extends infer O
      ? { [K in keyof O]: ExpandRecursively<O[K]> }
      : never
    : T
