// Ensure this is a module.
export {};

/**
 * @import {Passable} from '@endo/pass-style'
 * @import {Vow, VowTools} from '@agoric/vow'
 * @import {LogStore} from './log-store.js'
 * @import {Bijection} from './bijection.js'
 * @import {EndowmentTools} from './endowments.js'
 */

/**
 * @typedef {'Running' |
 *           'Sleeping' |
 *           'Replaying' |
 *           'Failed' |
 *           'Done'
 * } FlowState
 */

/**
 * `T` defaults to `any`, not `Passable`, because unwrapped guests include
 * non-passables, like unwrapped functions and unwrapped state records.
 * (Unwrapped functions could be made into Remotables,
 * but since they still could not be made durable, in this context
 * it'd be pointless.)
 *
 * @template {any} [T=any]
 * @typedef {T} Guest
 */

/**
 * @template {Passable} [T=Passable]
 * @typedef {T} Host
 */

/**
 * A HostVow must be durably storable. It corresponds to an
 * ephemeral guest promise.
 *
 * @template {Passable} [T=Passable]
 * @typedef {Host<Vow<T>>} HostVow
 */

/**
 * @typedef {(...activationArgs: Guest[]) => Guest<Promise>} GuestAsyncFunc
 */

/**
 * @typedef {(...activationArgs: Host[]) => HostVow} HostAsyncFuncWrapper
 */

/**
 * @typedef {object} PreparationOptions
 * @property {VowTools} [vowTools]
 * @property {() => LogStore} [makeLogStore]
 * @property {() => Bijection} [makeBijection]
 * @property {EndowmentTools} [endowmentTools]
 */

/**
 * @typedef {'return'|'throw'} OutcomeKind
 */

/**
 * @typedef {{kind: 'return', result: any}
 *         | {kind: 'throw',  problem: any}
 * } Outcome
 */

/**
 * @template {WeakKey} [S=WeakKey]
 * @template {any} [V=any]
 * @typedef {object} Ephemera
 * @property {(self: S) => V} for
 * @property {(self: S) => void} resetFor
 */

/**
 * This is the typedef for the membrane log entries we currently implement.
 * See comment below for the commented-out typedef for the full
 * membrane log entry, which we do not yet support.
 *
 * @typedef {[ // ///////////////// From Host to Guest /////////////////////////
 *     op: 'doFulfill',
 *     vow: HostVow,
 *     fulfillment: Host,
 *   ] | [
 *     op: 'doReject',
 *     vow: HostVow,
 *     reason: Host,
 *   ] | [
 *     op: 'doReturn',
 *     callIndex: number,
 *     result: Host,
 *   ] | [
 *     op: 'doThrow',
 *     callIndex: number,
 *     problem: Host,
 *   ] | [ // ///////////////////// From Guest to Host /////////////////////////
 *     op: 'checkCall',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'checkSendOnly',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'checkSend',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ]} LogEntry
 */

/**
 * This would be the typedef for the full membrane log, if we supported
 * - the guest sending guest-promises and guest-remotables to the host
 * - the guest using `E` to eventual-send to guest wrappers of host
 *   vows and remotables.
 *
 * at-typedef {[ // ///////////////// From Host to Guest ///////////////////////
 *     op: 'doFulfill',
 *     vow: HostVow,
 *     fulfillment: Host,
 *   ] | [
 *     op: 'doReject',
 *     vow: HostVow,
 *     reason: Host,
 *   ] | [
 *     op: 'doCall',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'doSendOnly',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'doSend',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'doReturn',
 *     callIndex: number,
 *     result: Host,
 *   ] | [
 *     op: 'doThrow',
 *     callIndex: number,
 *     problem: Host,
 *   ] | [ // ///////////////////// From Guest to Host /////////////////////////
 *     op: 'checkFulfill',
 *     vow: HostVow,
 *     fulfillment: Host,
 *   ] | [
 *     op: 'checkReject',
 *     vow: HostVow,
 *     reason: Host,
 *   ] | [
 *     op: 'checkCall',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'checkSendOnly',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'checkSend',
 *     target: Host,
 *     optVerb: PropertyKey|undefined,
 *     args: Host[],
 *     callIndex: number
 *   ] | [
 *     op: 'checkReturn',
 *     callIndex: number,
 *     result: Host,
 *   ] | [
 *     op: 'checkThrow',
 *     callIndex: number,
 *     problem: Host,
 *   ]} LogEntry
 */
