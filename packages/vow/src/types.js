// @ts-check
export {};

/**
 * @import {CopyTagged} from '@endo/pass-style'
 * @import {RemotableObject} from '@endo/pass-style';
 * @import {Remote} from '@agoric/internal';
 * @import {prepareVowTools} from './tools.js'
 */

/**
 * @callback IsRetryableReason
 * Return truthy if a rejection reason should result in a retry.
 * @param {any} reason
 * @param {any} priorRetryValue the previous value returned by this function
 * when deciding whether to retry the same logical operation
 * @returns {any} If falsy, the reason is not retryable. If truthy, the
 * priorRetryValue for the next call.
 */

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
 * Follow the chain of vow shortening to the end, returning the final value.
 * This is used within E, so we must narrow the type to its remote form.
 * @template T
 * @typedef {(
 *   T extends Vow<infer U> ? EUnwrap<U> :
 *   T extends PromiseLike<infer U> ? EUnwrap<U> :
 *   T
 * )} EUnwrap
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
 * @property {RemotableObject & Remote<VowV0<T>>} vowV0
 */

/**
 * @template [T=any]
 * @typedef {CopyTagged<'Vow', VowPayload<T>>} Vow
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
 * @typedef {{ resolve(value?: T | PromiseVow<T>): void, reject(reason?: any): void }} VowResolver
 */

/**
 * @template [T=any]
 * @template [TResult1=T]
 * @template [TResult2=never]
 * @template [C=any] watcher context
 * @typedef {object} Watcher
 * @property {(value: T, context?: C) => Vow<TResult1> | PromiseVow<TResult1> | TResult1} [onFulfilled]
 * @property {(reason: any) => Vow<TResult2> | PromiseVow<TResult2> | TResult2} [onRejected]
 */
