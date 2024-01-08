// @ts-check
export { };

/**
 * @template T
 * @typedef {PromiseLike<T | Whenable<T>>} PromiseWhenable
 */

/**
 * @template [T=any]
 * @typedef {{ whenable0: { shorten(): Promise<T | Whenable<T>>} }} WhenablePayload
 */

/**
 * @template [T=any]
 * @typedef {import('@endo/pass-style').CopyTagged<
 *   'Whenable', WhenablePayload
 * >} Whenable
 */

/**
 * @template [T=any]
 * @typedef {{
 *   whenable: Whenable<T>,
 *   settler: Settler<T>,
 * }} WhenableKit
 */

/**
 * @template [T=any]
 * @typedef {{
 *   whenable: Whenable<T>,
 *   settler: Settler<T>,
 *   promise: Promise<T>
 * }} WhenablePromiseKit
 */

/**
 * @template [T=any]
 * @typedef {{ resolve(value?: T | PromiseWhenable<T>): void, reject(reason?: any): void }} Settler
 */

/**
 * @template [T=any]
 * @template [TResult1=T]
 * @template [TResult2=T]
 * @typedef {object} Watcher
 * @property {(value: T) => Whenable<TResult1> | PromiseWhenable<TResult1> | TResult1} [onFulfilled]
 * @property {(reason: any) => Whenable<TResult2> | PromiseWhenable<TResult2> | TResult2} [onRejected]
 */
