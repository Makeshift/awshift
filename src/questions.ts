import { type Command } from '@oclif/core'
import { type BooleanFlag, type FlagOutput, type OptionFlag } from '@oclif/core/lib/interfaces/parser'
import log from './log'

/**
 * The flags that were provided to the oclif command.
 */
export type CommandFlags = Awaited<ReturnType<Command['parse']>>['flags']

/**
 * A validation function that can be used to validate the answer to a question.
 * Must return true if the answer is valid, or a string explaining why the answer is invalid.
 * @template T The type of the answer.
 */
type ValidateFn<T> = (value: T) => true | string
/**
 * A function that transforms the answer to a question. Must accept a string or T and return T.
 */
type TransformFn<T> = (value: T | string) => T
/**
 * If T is a string, this field is optional. If T is not a string, this field is required.
 */
type OptionalTransformFn<T> = T extends string ? (TransformFn<T> | undefined) : TransformFn<T>

/**
 * Defines a question that can be resolved to a value.
 * @template T The type of the answer.
 * Precedence: arg > ask
 */
export class FlexibleQuestion<T = string> {
  /**
   * An @oclif/core Flags object to define the argument that a command can take.
   */
  arg: OptionFlag<T> | BooleanFlag<T>
  /**
   * If true, the prompt will be skipped if the value is not missing. If false, the prompt will be shown with the value as the default (if it exists).
   */
  skipIfAnswerExists?: boolean
  /**
   * A function that will be called to ask the user for input. Probably an inquirer prompt.
   * @param defaultValue This function may be called with a defaultValue, determined by skipIfAnswerExists. This defaultValue should be used as the default value in the prompt.
   * @param validate The validation function you provided in the constructor, exposed here for use in inquirer.
   * @returns The answer to the question.
   */
  ask: (defaultValue?: T, validate?: this['validate']) => Promise<T>
  /**
   * An optional function to validate the answer, irrelevant of where it came from.
   * If validation fails, the value will be assumed to be missing.
   * This validation function is provided back to your 'ask' function for use in inquirer.
   * @param value
   * @returns
   */
  validate?: ValidateFn<T>
  /**
   * An optional function to transform the value before it is returned.
   * If your answer type is not a string, you must provide a transform function (because arg will return string).
   */
  transform?: OptionalTransformFn<T>

  /**
   * Grab the answer from the provided flags if possible.
   * @param providedFlags The list of CommandFlags provided to the oclif command.
   * @returns The value of the flag, if it exists.
   */
  resolveArg (providedFlags: CommandFlags): T | undefined {
    if (this.arg) {
      const flagName = this.arg.name
      if (providedFlags[this.arg.name]) {
        let value: string | T = providedFlags[this.arg.name]
        log.debug(`Flag ${flagName} was provided with content: ${value as string}`)
        if (this.transform) {
          value = this.transform(value)
          log.debug(`Transformed flag ${flagName} to: ${value as string}`)
        }
        if (isValidAnswer<T>(value, this.validate)) {
          log.debug(`Flag ${flagName} passed validation`)
          return value
        }
        log.warn(`Flag ${flagName} was provided, but failed validation with content: ${value}`)
      }
    }
    return undefined
  }

  /**
   * The last answer the user gave to this question.
   */
  private lastAnswer?: T

  /**
   * Figures out if we need to ask the user for input, asks them if needed, and returns the answer.
   * @param inferredAnswer An answer inferred from the environment or flags.
   * @param retry If true, the user will be asked for input again if the answer is invalid.
   * @returns The answer to the question, or undefined if the answer is invalid and retry is false.
   */
  async resolveQuestion (inferredAnswer?: T, retry = false): Promise<T | undefined> {
    // Prefer the last answer the user gave rather than the inferred answer, if it's valid
    let currentAnswer: T | undefined
    if (isValidAnswer<T>(this.lastAnswer, this.validate)) {
      log.debug(`Last answer was valid: ${this.lastAnswer as string}`)
      currentAnswer = this.lastAnswer
    } else if (isValidAnswer<T>(inferredAnswer, this.validate)) {
      log.debug(`Inferred answer was valid: ${inferredAnswer as string}`)
      currentAnswer = inferredAnswer
    }

    // If we skip on existing answer and the answer exists, return it
    if (this.skipIfAnswerExists && currentAnswer) {
      log.debug('Skipping question because answer exists')
      return currentAnswer
    }

    // Failing that, ask the user for input
    log.debug('Asking user for input')
    currentAnswer = await this.ask(currentAnswer, this.validate)
    log.debug(`User provided answer: ${currentAnswer as string}`)
    // Perform transformations
    if (this.transform) {
      currentAnswer = this.transform(currentAnswer)
      log.debug(`Transformed answer to: ${currentAnswer as string}`)
    }
    // If the answer is valid, store it and return it
    if (isValidAnswer<T>(currentAnswer, this.validate)) {
      this.lastAnswer = currentAnswer
      log.debug('Answer passed validation')
      return currentAnswer
    }
    // If the answer is invalid, retry if instructed
    if (retry) {
      log.warn('Answer failed validation, retrying')
      return await this.resolveQuestion(undefined, retry)
    }
    // If the answer is invalid and we're not retrying, panic and return undefined
    log.warn('Answer failed validation and no retry was requested')
    return undefined
  }

  /**
   * Works out where the answer should come from and resolves it.
   * @param flags The flags provided to the oclif command.
   * @param retry If true, the user will be asked for input again if the answer is invalid.
   * @returns The resolved answer to the question.
   */
  async resolve (flags: CommandFlags, retry = false): Promise<T> {
    const inferredAnswer = this.resolveArg(flags)
    const finalAnswer = await this.resolveQuestion(inferredAnswer, retry) as T
    return finalAnswer
  }

  constructor ({ arg, skipIfAnswerExists, ask, validate, transform }: {
    arg: OptionFlag<T> | BooleanFlag<T>
    skipIfAnswerExists?: boolean
    ask: (defaultValue?: T, validate?: ValidateFn<T>) => Promise<T>
    validate?: ValidateFn<T>
    transform?: OptionalTransformFn<T>
  }) {
    this.arg = arg
    this.skipIfAnswerExists = skipIfAnswerExists
    this.ask = ask
    this.validate = validate
    this.transform = transform
  }
}

/**
 * Represents the answers to a QuestionSet.
 */
type Answers<T extends Record<string, FlexibleQuestion>> = {
  [Prop in keyof T]: Awaited<ReturnType<T[Prop]['ask']>>
}

/**
 * Answer a set of FlexibleQuestions and return the result as an object.
 */
export class FlexibleQuestionSet {
  flags: FlagOutput = {}
  constructor (public questions: Record<string, FlexibleQuestion>) {
    for (const key in questions) {
      if (questions[key].arg) {
        this.flags[key] = questions[key].arg
      }
    }
  }

  /**
   * Loops through all the questions and resolves them.
   * @param flags The flags provided to the oclif command.
   * @param retry If true, the user will be asked for input again if the answer is invalid.
   * @returns The resolved answers to the questions as an object matching the question keys.
   */
  async resolve (flags: CommandFlags, retry = false): Promise<Answers<typeof this.questions>> {
    const answers: Answers<typeof this.questions> = {}
    for (const key in this.questions) {
      // This can resolve to undefined when we don't expect it to, but we're going to assume it doesn't because that's a weird situation to be in
      answers[key] = await this.questions[key].resolve(flags, retry) as Awaited<ReturnType<this['questions'][typeof key]['ask']>>
    }
    return answers
  }
}
/**
 * Validates that answer is T and passes the optionally provided validate function.
 * @param answer The answer to validate.
 * @param validate An optional validation function.
 * @returns True if the answer meets validation criteria, false otherwise.
 */
function isValidAnswer<T> (answer: any, validate?: ValidateFn<T>): answer is T {
  if (answer !== null && answer !== '') {
    let validationResponse: string | boolean = true
    if (validate) {
      validationResponse = validate(answer as T)
    }
    if (typeof validationResponse === 'string') {
      log.warn('Answer failed validation:', validationResponse)
      return false
    }
    return true
  }
  return false
}
