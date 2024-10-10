/**
 * @file These tools mostly duplicate code that will be added in other PRs
 * and eventually migrated to synthetic-chain. Sorry for the duplication.
 */

/**
 * @typedef {object} RetryOptions
 * @property {number} [maxRetries]
 * @property {number} [retryIntervalMs]
 * @property {(...arg0: string[]) => void} [log]
 * @property {(object) => void} [setTimeout]
 * @property {string} [errorMessage=Error]
 */

const ambientSetTimeout = globalThis.setTimeout;

/**
 * From https://github.com/Agoric/agoric-sdk/blob/442f07c8f0af03281b52b90e90c27131eef6f331/multichain-testing/tools/sleep.ts#L10
 *
 * @param {number} ms
 * @param {*} sleepOptions
 */
const sleep = (ms, { log = () => {}, setTimeout = ambientSetTimeout }) =>
  new Promise(resolve => {
    log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });

/**
 * From https://github.com/Agoric/agoric-sdk/blob/442f07c8f0af03281b52b90e90c27131eef6f331/multichain-testing/tools/sleep.ts#L24
 *
 * @param {() => Promise} operation
 * @param {(result: any) => boolean} condition
 * @param {string} message
 * @param {RetryOptions} options
 */
export const retryUntilCondition = async (
  operation,
  condition,
  message,
  { maxRetries = 6, retryIntervalMs = 3500, log, setTimeout },
) => {
  console.log({ maxRetries, retryIntervalMs, message });
  let retries = 0;

  await null;
  while (retries < maxRetries) {
    try {
      const result = await operation();
      log('RESULT', result);
      if (condition(result)) {
        return result;
      }
    } catch (error) {
      if (error instanceof Error) {
        log(`Error: ${error.message}`);
      } else {
        log(`Unknown error: ${String(error)}`);
      }
    }

    retries += 1;
    console.log(
      `Retry ${retries}/${maxRetries} - Waiting for ${retryIntervalMs}ms for ${message}...`,
    );
    await sleep(retryIntervalMs, { log, setTimeout });
  }

  throw Error(`${message} condition failed after ${maxRetries} retries.`);
};
