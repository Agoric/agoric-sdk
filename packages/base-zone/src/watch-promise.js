// @ts-check
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { E } from '@endo/far';

const { apply } = Reflect;

/**
 * A PromiseWatcher method guard callable with or more arguments, returning void.
 */
export const PromiseWatcherHandler = M.call(M.raw()).rest(M.raw()).returns();

/**
 * A PromiseWatcher interface that has both onFulfilled and onRejected handlers.
 */
export const PromiseWatcherI = M.interface('PromiseWatcher', {
  onFulfilled: PromiseWatcherHandler,
  onRejected: PromiseWatcherHandler,
});

/**
 * A PromiseWatcher interface that has only an onFulfilled handler.
 */
export const PromiseWatcherFulfilledI = M.interface('PromiseWatcherFulfilled', {
  onFulfilled: PromiseWatcherHandler,
});

/**
 * A PromiseWatcher interface that has only an onRejected handler.
 */
export const PromiseWatcherRejectedI = M.interface('PromiseWatcherRejected', {
  onRejected: PromiseWatcherHandler,
});

/**
 * @typedef {object} PromiseWatcher
 * @property {(fulfilment: unknown, ...args: unknown[]) => void} [onFulfilled]
 * @property {(reason: unknown, ...args: unknown[]) => void} [onRejected]
 */

/**
 * Adapt a promise watcher method to E.when.
 * @param {Record<PropertyKey, (...args: unknown[]) => unknown>} that
 * @param {PropertyKey} prop
 * @param {unknown[]} postArgs
 */
const callMeMaybe = (that, prop, postArgs) => {
  const fn = that[prop];
  if (!fn) {
    return undefined;
  }
  assert.typeof(fn, 'function');
  /**
   * @param {unknown} arg value or reason
   */
  const wrapped = arg => {
    // Don't return a value, to prevent E.when from subscribing to a resulting
    // promise.
    apply(fn, that, [arg, ...postArgs]);
  };
  return wrapped;
};

/**
 * Shim the promise watcher behaviour when VatData.watchPromise is not available.
 *
 * @param {Promise<any>} p
 * @param {PromiseWatcher} watcher
 * @param {...unknown} watcherArgs
 * @returns {void}
 */
export const watchPromise = (p, watcher, ...watcherArgs) => {
  Promise.resolve(p) === p || Fail`watchPromise only watches promises`;
  const onFulfilled = callMeMaybe(watcher, 'onFulfilled', watcherArgs);
  const onRejected = callMeMaybe(watcher, 'onRejected', watcherArgs);
  onFulfilled ||
    onRejected ||
    Fail`promise watcher must implement at least one handler method`;
  void E.when(p, onFulfilled, onRejected);
};
harden(watchPromise);
