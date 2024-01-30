// @ts-check
export {};

/**
 * @template T
 * @typedef {PromiseLike<T | Whenable<T>>} PromiseWhenable
 */

/**
 * @template T
 * @typedef {import('./E').ERef<T>} ERef
 */

/**
 * Creates a type that accepts both near and marshalled references that were
 * returned from `Remotable` or `Far`, and also promises for such references.
 *
 * @template Primary The type of the primary reference.
 * @template [Local=import('./E').DataOnly<Primary>] The local properties of the object.
 * @typedef {ERef<Local & import('@endo/eventual-send').RemotableBrand<Local, Primary>>} FarRef
 */

/**
 * @template [T=any]
 * @typedef {object} WhenableV0 The first version of the whenable implementation
 * object.  CAVEAT: These methods must never be changed or added to, to provide
 * forward/backward compatibility.  Create a new object and bump its version
 * number instead.
 *
 * @property {() => Promise<T>} shorten Attempt to unwrap all whenables in this
 * promise chain, returning a promise for the final value.  A rejection may
 * indicate a temporary routing failure requiring a retry, otherwise that the
 * decider of the terminal promise rejected it.
 */

/**
 * @template [T=any]
 * @typedef {object} WhenablePayload
 * @property {import('@endo/far').FarRef<WhenableV0<T>>} whenableV0
 */

/**
 * @template [T=any]
 * @typedef {import('@endo/pass-style').CopyTagged<
 *   'Whenable', WhenablePayload<T>
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
