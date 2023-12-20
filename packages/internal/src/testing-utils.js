/**
 * @file note this cannot be called test-utils.js due to
 *   https://github.com/Agoric/agoric-sdk/issues/7503
 */
/* global setImmediate */

/**
 * A workaround for some issues with fake time in tests.
 *
 * Lines of test code can depend on async promises outside the test resolving
 * before they run. Awaiting this function result ensures that all promises that
 * can do resolve. Note that this doesn't mean all outstanding promises.
 */
export const eventLoopIteration = async () =>
  new Promise(resolve => setImmediate(resolve));
harden(eventLoopIteration);
