const ambientSetTimeout = globalThis.setTimeout;

// Derived from the fact that AVA's "default timeout is 10 seconds."
// https://github.com/avajs/ava/blob/main/docs/07-test-timeouts.md#test-timeouts
export const DEFAULT_STIR_EVERY_MS = 8_000;

type Log = (...values: unknown[]) => void;

type SleepOptions = {
  log?: Log;
  setTimeout?: typeof ambientSetTimeout;
  stirEveryMs?: number;
  /**
   * Call every `stirEveryMs` during sleeping so that the sleeper isn't timed
   * out by, e.g. a test runner.
   * @param description - A bit of context as to why we're stirring.
   */
  stir?: (description: string) => void;
};

/**
 *
 * @param {number} ms Sleep duration in milliseconds
 * @param {SleepOptions} opts
 * @returns {Promise<void>}
 */
const deepSleep = (
  ms: number,
  { setTimeout = ambientSetTimeout }: SleepOptions = {},
) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export const stirUntilSettled = async <T>(
  result: T,
  {
    log = () => {},
    setTimeout = ambientSetTimeout,
    stirEveryMs = DEFAULT_STIR_EVERY_MS,
    stir,
  }: SleepOptions = {},
): Promise<Awaited<T>> => {
  const resultP = Promise.resolve(result);
  if (!stir) {
    return resultP;
  }
  let keepStirring = !!stir;
  try {
    // Ensure that we stop stirring when the result is settled.
    resultP.finally(() => (keepStirring = false));

    log(`start stirring`);
    let nStirs = 0;
    while (keepStirring) {
      await new Promise(resolve => {
        setTimeout(resolve, stirEveryMs);
      });
      nStirs += 1;
      await (keepStirring && stir(`stir #${nStirs}`));
    }
    log(`done stirring`);
    return resultP;
  } finally {
    keepStirring = false;
  }
};

export const sleep = async (
  ms: number,
  {
    log = () => {},
    stir,
    stirEveryMs = DEFAULT_STIR_EVERY_MS,
    setTimeout = ambientSetTimeout,
  }: SleepOptions = {},
) => {
  log(`Sleeping for ${ms}ms...`);
  await (stir && stir(`sleeping for ${ms}ms...`));
  const slept = deepSleep(ms, { setTimeout });
  await stirUntilSettled(slept, {
    log,
    stir,
    stirEveryMs,
    setTimeout,
  });
};

export type RetryOptions = {
  maxRetries?: number;
  retryIntervalMs?: number;
} & SleepOptions;

const retryUntilCondition = async <T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  message: string,
  {
    maxRetries = 6,
    retryIntervalMs = 3500,
    log = () => {},
    stirEveryMs,
    stir,
    setTimeout = ambientSetTimeout,
  }: RetryOptions = {},
): Promise<T> => {
  console.log({ maxRetries, retryIntervalMs, message });
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const resultP = operation();
      const result = await stirUntilSettled(resultP, {
        log,
        stirEveryMs,
        stir,
        setTimeout,
      });
      if (condition(result)) {
        return result;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        log(`Error: ${error.message}`);
      } else {
        log(`Unknown error: ${String(error)}`);
      }
    }

    retries++;
    console.log(
      `Retry ${retries}/${maxRetries} - Waiting for ${retryIntervalMs}ms for ${message}...`,
    );
    await sleep(retryIntervalMs, { log, setTimeout, stirEveryMs, stir });
  }

  throw Error(`${message} condition failed after ${maxRetries} retries.`);
};

export const makeRetryUntilCondition = (defaultOptions: RetryOptions = {}) => {
  /**
   * Retry an asynchronous operation until a condition is met.
   * Defaults to maxRetries = 6, retryIntervalMs = 3500
   */
  return <T>(
    operation: () => Promise<T>,
    condition: (result: T) => boolean,
    message: string,
    options?: RetryOptions,
  ) =>
    retryUntilCondition(operation, condition, message, {
      ...defaultOptions,
      ...options,
    });
};
