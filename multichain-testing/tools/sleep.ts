import { scheduler } from 'node:timers/promises';

type Log = (...values: unknown[]) => void;

const retryUntilCondition = async <T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  message: string,
  maxRetries: number,
  retryIntervalMs: number,
  log: Log,
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
    await scheduler.wait(retryIntervalMs);
  }

  throw new Error(`${message} condition failed after ${maxRetries} retries.`);
};

export const makeRetryUntilCondition =
  (
    log: Log = () => {},
    maxRetries: number = 6,
    retryIntervalMs: number = 3500,
  ) =>
  <T>(
    operation: () => Promise<T>,
    condition: (result: T) => boolean,
    message: string,
  ) =>
    retryUntilCondition(
      operation,
      condition,
      message,
      maxRetries,
      retryIntervalMs,
      log,
    );
