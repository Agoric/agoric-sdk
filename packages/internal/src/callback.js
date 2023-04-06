// @ts-check
import { E } from '@endo/far';
import { isObject } from '@endo/marshal';

const { Fail } = assert;

/**
 * @template {(...args: unknown[]) => any} I
 * @typedef {import('./types').Callback<I>} Callback
 */

/**
 * @template {(...args: unknown[]) => any} I
 * @typedef {import('./types').SyncCallback<I>} SyncCallback
 */

/**
 * Synchronously call a callback.
 *
 * @template {(...args: unknown[]) => any} I
 * @param {SyncCallback<I>} callback
 * @param {Parameters<I>} args
 * @returns {ReturnType<I>}
 */
export const callSync = (callback, ...args) => {
  const { target, methodName, bound } = callback;
  if (methodName === undefined) {
    return target(...bound, ...args);
  }
  return target[methodName](...bound, ...args);
};

/**
 * Eventual send to a callback.
 *
 * @template {(...args: unknown[]) => any} I
 * @param {Callback<I>} callback
 * @param {Parameters<I>} args
 * @returns {Promise<Awaited<ReturnType<I>>>}
 */
export const callE = (callback, ...args) => {
  const { target, methodName, bound } = callback;
  if (methodName === undefined) {
    return E(target)(...bound, ...args);
  }
  return E(target)[methodName](...bound, ...args);
};

/**
 * Create a callback from a near function.
 *
 * @template {(...args: unknown[]) => any} I
 * @template {(...args: [...B, ...Parameters<I>]) => ReturnType<I>} [T=I]
 * @template {unknown[]} [B=[]]
 * @param {T} target
 * @param {B} bound
 * @returns {SyncCallback<I>}
 */
export const makeSyncFunctionCallback = (target, ...bound) => {
  typeof target === 'function' ||
    Fail`sync function callback target must be a function: ${target}`;
  /** @type {unknown} */
  const cb = harden({ target, bound });
  return /** @type {SyncCallback<I>} */ (cb);
};
harden(makeSyncFunctionCallback);

/**
 * Create a callback from a potentially far function.
 *
 * @template {(...args: unknown[]) => any} I
 * @template {import('@endo/far').ERef<
 *   (...args: [...B, ...Parameters<I>]) => ReturnType<I>
 * >} [T=import('@endo/far').ERef<I>]
 * @template {unknown[]} [B=[]]
 * @param {T} target
 * @param {B} bound
 * @returns {Callback<I>}
 */
export const makeFunctionCallback = (target, ...bound) => {
  isObject(target) ||
    Fail`function callback target must be a function presence: ${target}`;
  /** @type {unknown} */
  const cb = harden({ target, bound });
  return /** @type {Callback<I>} */ (cb);
};
harden(makeFunctionCallback);

/**
 * Create a callback from a near method.
 *
 * @template {(...args: unknown[]) => any} I
 * @template {PropertyKey} P
 * @template {{
 *   [x in P]: (...args: [...B, ...Parameters<I>]) => ReturnType<I>
 * }} [T={ [x in P]: I }]
 * @template {unknown[]} [B=[]]
 * @param {T} target
 * @param {P} methodName
 * @param {B} bound
 * @returns {SyncCallback<I>}
 */
export const makeSyncMethodCallback = (target, methodName, ...bound) => {
  isObject(target) ||
    Fail`sync method callback target must be an object: ${target}`;
  typeof methodName === 'string' ||
    Fail`method name must be a string: ${methodName}`;
  /** @type {unknown} */
  const cb = harden({ target, methodName, bound });
  return /** @type {SyncCallback<I>} */ (cb);
};
harden(makeSyncMethodCallback);

/**
 * Create a callback from a potentially far method.
 *
 * @template {(...args: unknown[]) => any} I
 * @template {PropertyKey} P
 * @template {import('@endo/far').ERef<{
 *   [x in P]: (...args: [...B, ...Parameters<I>]) => ReturnType<I>
 * }>} [T=import('@endo/far').ERef<{ [x in P]: I }>]
 * @template {unknown[]} [B=[]]
 * @param {T} target
 * @param {P} methodName
 * @param {B} bound
 * @returns {Callback<I>}
 */
export const makeMethodCallback = (target, methodName, ...bound) => {
  isObject(target) || Fail`method callback target must be an object: ${target}`;
  typeof methodName === 'string' ||
    Fail`method name must be a string: ${methodName}`;
  /** @type {unknown} */
  const cb = harden({ target, methodName, bound });
  return /** @type {Callback<I>} */ (cb);
};
harden(makeMethodCallback);

/**
 * @param {any} callback
 * @returns {callback is Callback}
 */
export const isCallback = callback => {
  if (!isObject(callback)) {
    return false;
  }
  const { target, methodName, bound } = callback;
  return (
    isObject(target) &&
    (methodName === undefined || typeof methodName === 'string') &&
    Array.isArray(bound)
  );
};
harden(isCallback);
