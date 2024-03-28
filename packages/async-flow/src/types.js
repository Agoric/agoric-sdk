/**
 * @template {Passable} [T=Passable]
 * @typedef {T} Guest
 */

/**
 * @template {Passable} [T=Passable]
 * @typedef {T} Host
 */

/**
 * @template {Passable} [T=Passable]
 * @typedef {import('@agoric/vow').Vow<T>} Vow
 */

/**
 * A HostVow must be durably storable. It corresponds to an
 * ephemeral guest promise.
 *
 * @template {Passable} [T=Passable]
 * @typedef {Host<Promise<T> | Vow<T> | Promise<Vow<T>>>} HostVow
 */

/**
 * @typedef {(...activationArgs: Guest[]) => Guest<Promise>} GuestAsyncFunc
 */

/**
 * @typedef {(...activationArgs: Host[]) => HostVow} HostAsyncFuncWrapper
 */

/**
 * @typedef {object} PreparationOptions
 * @property {import('@agoric/vow').VowTools} [vowTools]
 * @property {() => import('./log-store.js').LogStore} [makeLogStore]
 * @property {() => import('./weak-bijection.js').WeakBijection
 * } [makeWeakBijection]
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
 *     prom: Host<HostVow>,
 *     fulfillment: Host,
 *   ] | [
 *     op: 'doReject',
 *     prom: Host<HostVow>,
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
 *   ]} LogEntry
 */

/**
 * This would be the typedef for the full membrane log, if we supported
 * the guest sending promises and remotables to the host, for the host to
 * then use.
 *
 * at-typedef {[ // ///////////////// From Host to Guest ///////////////////////
 *     op: 'doFulfill',
 *     prom: Host<HostVow>,
 *     fulfillment: Host,
 *   ] | [
 *     op: 'doReject',
 *     prom: Host<HostVow>,
 *     reason: Host,
 *   ] | [
 *     op: 'doCall',
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
 *     prom: Host<HostVow>,
 *     fulfillment: Host,
 *   ] | [
 *     op: 'checkReject',
 *     prom: Host<HostVow>,
 *     reason: Host,
 *   ] | [
 *     op: 'checkCall',
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
