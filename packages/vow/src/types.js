// @ts-check
export {};

/** @typedef {(...args: any[]) => any} Callable */

/**
 * @template T
 * @typedef {Promise<T | Vow<T>>} PromiseVow Return type of a function that may
 * return a promise or a vow.
 */

/**
 * @template T
 * @typedef {T | PromiseLike<T>} ERef
 */

/**
 * @template T
 * @typedef {(
 *   T extends bigint ? true :
 *   T extends boolean ? true :
 *   T extends null ? true :
 *   T extends number ? true :
 *   T extends string ? true :
 *   T extends symbol ? true :
 *   T extends undefined ? true :
 *   false
 * )} IsPrimitive Whether T is a primitive type.
 */

/**
 * @template T
 * @typedef {(
 *   IsPrimitive<T> extends true ? T :
 *   T extends Callable ? never :
 *   { [P in keyof T as T[P] extends Callable ? never : P]: DataOnly<T[P]> }
 * )} DataOnly Recursively extract the non-callable properties of T.
 */

/**
 * Follow the chain of vow shortening to the end, returning the final value.
 * This is used within E, so we must narrow the type to its remote form.
 * @template T
 * @typedef {(
 *   T extends PromiseLike<infer U> ? Unwrap<U> :
 *   T extends import('./types').Vow<infer U> ? Unwrap<U> :
 *   IsPrimitive<T> extends true ? T :
 *   T extends import('@endo/eventual-send').RemotableBrand<infer Local, infer Primary> ? Local & T :
 *   T
 * )} Unwrap
 */

/**
 * A type that accepts both near and marshalled references that were
 * returned from `Remotable` or `Far`.
 * @template Primary The type of the primary reference.
 * @template [Local=DataOnly<Primary>] The local properties of the object.
 * @typedef {Primary |
 *   import('@endo/eventual-send').RemotableBrand<Local, Primary>
 * } Remote A type that doesn't assume its parameter is local, but is
 * satisfied with both local and remote references.
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
 * @property {Remote<VowV0<T>>} vowV0
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

/** @typedef {ReturnType<import('./tools.js').prepareVowTools>} VowTools */
