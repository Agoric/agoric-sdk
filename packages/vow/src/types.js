// @ts-check
export {};

/**
 * @template T
 * @typedef {PromiseLike<T | Vow<T>>} PromiseVow
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
 * @typedef {object} VowV0 The first version of the vow implementation
 * object.  CAVEAT: These methods must never be changed or added to, to provide
 * forward/backward compatibility.  Create a new object and bump its version
 * number instead.
 *
 * @property {() => Promise<T>} shorten Attempt to unwrap all vows in this
 * promise chain, returning a promise for the final value.  A rejection may
 * indicate a temporary routing failure requiring a retry, otherwise that the
 * decider of the terminal promise rejected it.
 */

/**
 * @template [T=any]
 * @typedef {object} VowPayload
 * @property {import('@endo/eventual-send').FarRef<VowV0<T>>} vowV0
 */

/**
 * @template [T=any]
 * @typedef {import('@endo/pass-style').CopyTagged<
 *   'Vow', VowPayload<T>
 * >} Vow
 */

/**
 * @template [T=any]
 * @typedef {{
 *   vow: Vow<T>,
 *   resolver: VowResolver<T>,
 * }} VowKit
 */

/**
 * @template [T=any]
 * @typedef {{
 *   vow: Vow<T>,
 *   resolver: VowResolver<T>,
 *   promise: Promise<T>
 * }} VowPromiseKit
 */

/**
 * @template [T=any]
 * @typedef {{ resolve(value?: T | PromiseVow<T>): void, reject(reason?: any): void }} VowResolver
 */

/**
 * @template [T=any]
 * @template [TResult1=T]
 * @template [TResult2=T]
 * @typedef {object} Watcher
 * @property {(value: T) => Vow<TResult1> | PromiseVow<TResult1> | TResult1} [onFulfilled]
 * @property {(reason: any) => Vow<TResult2> | PromiseVow<TResult2> | TResult2} [onRejected]
 */

/**
 * @template [T=any]
 * @typedef {import('./types.js').ERef<T | import('./types.js').Vow<T>>} Specimen
 */
