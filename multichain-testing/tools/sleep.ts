type Log = (...values: unknown[]) => void;

export const sleep = (ms: number, log: Log = () => {}) =>
  new Promise(resolve => {
    log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });

type RetryOptions = {
  maxRetries?: number;
  retryIntervalMs?: number;
};

const retryUntilCondition = async <T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  message: string,
  log: Log,
  { maxRetries = 6, retryIntervalMs = 3500 }: RetryOptions = {},
): Promise<T> => {
  console.log({ maxRetries, retryIntervalMs, message });
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const result = await operation();
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
    await sleep(retryIntervalMs, log);
  }

  throw new Error(`${message} condition failed after ${maxRetries} retries.`);
};

export const makeRetryUntilCondition = (log: Log = () => {}) => {
  /**
   * Retry an asynchronous operation until a condition is met.
   * Defaults to maxRetries = 6, retryIntervalMs = 3500
   */
  return <T>(
    operation: () => Promise<T>,
    condition: (result: T) => boolean,
    message: string,
    opts?: RetryOptions,
  ) => retryUntilCondition(operation, condition, message, log, opts);
};
