/* eslint-disable no-use-before-define */
import type { Passable } from '@endo/pass-style';
import type { Vow, VowTools } from '@agoric/vow';
import type { LogStore } from './log-store.js';
import type { Bijection } from './bijection.js';
import type { EndowmentTools } from './endowments.js';

export type FlowState =
  | 'Running'
  | 'Sleeping'
  | 'Replaying'
  | 'Failed'
  | 'Done';

/**
 * `T` defaults to `any`, not `Passable`, because unwrapped guests include
 * non-passables, like unwrapped functions and unwrapped state records.
 * (Unwrapped functions could be made into Remotables,
 * but since they still could not be made durable, in this context
 * it'd be pointless.)
 */
export type Guest<T extends unknown = any> = T;
export type Host<T extends Passable = Passable> = T;

/**
 * A HostVow must be durably storable. It corresponds to an
 * ephemeral guest promise.
 */
export type HostVow<T extends Passable = Passable> = Host<Vow<T>>;

export type GuestAsyncFunc = (
  ...activationArgs: Guest[]
) => Guest<Promise<any>>;

export type HostAsyncFuncWrapper = (
  ...activationArgs: Host<any>[]
) => HostVow<any>;

/**
 * The function from the host as it will be available in the guest.
 *
 * Specifically, Vow return values are converted to Promises.
 */
export type GuestOf<F extends HostAsyncFuncWrapper> = F extends (
  ...args: infer A
) => Vow<infer R>
  ? (...args: A) => Promise<R>
  : F;

// from https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

/**
 * Convert an entire Guest interface into what the host will implement.
 */
export type HostInterface<T> = {
  [K in keyof T]: T[K] extends CallableFunction
    ? HostOf<T[K]>
    : T[K] extends Record<string, any>
      ? Simplify<HostInterface<T[K]>>
      : T[K];
};

/**
 * Convert an entire Host interface into what the Guest will receive.
 */
export type GuestInterface<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Vow<infer R>
    ? (...args: Parameters<T[K]>) => Promise<R>
    : T[K] extends HostAsyncFuncWrapper
      ? GuestOf<T[K]>
      : T[K] extends (...args: any[]) => infer R
        ? T[K]
        : T[K] extends object
          ? GuestInterface<T[K]>
          : T[K];
};

/**
 * The function the host must provide to match an interface the guest expects.
 *
 * Specifically, Promise return values are converted to Vows.
 */
export type HostOf<F extends CallableFunction> = F extends (
  ...args: infer A
) => infer R
  ? R extends Promise<infer T>
    ? (...args: A) => Vow<T extends Passable ? T : HostInterface<T>>
    : (...args: A) => HostInterface<R>
  : F;

export type HostArgs<GA extends any[]> = { [K in keyof GA]: HostOf<GA[K]> };

export type PreparationOptions = {
  vowTools?: VowTools;
  makeLogStore?: (() => LogStore) | undefined;
  makeBijection?: (() => Bijection) | undefined;
  endowmentTools?: EndowmentTools;
  panicHandler?: (e: any) => void;
};
export type OutcomeKind = 'return' | 'throw';

export type Outcome =
  | {
      kind: 'return';
      result: any;
    }
  | {
      kind: 'throw';
      problem: any;
    };

export type Ephemera<S extends WeakKey = WeakKey, V extends unknown = any> = {
  for: (self: S) => V;
  resetFor: (self: S) => void;
};

/**
 * This is the type alias for the membrane log entries we currently implement.
 *
 * @see {FutureLogEntry} below for the full membrane log entry, which we do not
 * yet support.
 */
export type LogEntry =
  | [
      // ///////////////// From Host to Guest /////////////////////////
      op: 'doFulfill',
      vow: HostVow,
      fulfillment: Host,
    ]
  | [op: 'doReject', vow: HostVow, reason: Host]
  | [op: 'doReturn', callIndex: number, result: Host]
  | [op: 'doThrow', callIndex: number, problem: Host]
  | [
      // ///////////////////// From Guest to Host /////////////////////////
      op: 'checkCall',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [
      op: 'checkSendOnly',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [
      op: 'checkSend',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ];

/**
 * This would be the type alias for the full membrane log, if we supported:
 * - the guest sending guest-promises and guest-remotables to the host
 * - the guest using `E` to eventual-send to guest wrappers of the host
 *   vows and remotables.
 */
export type FutureLogEntry =
  | [
      // ///////////////// From Host to Guest ///////////////////////
      op: 'doFulfill',
      vow: HostVow,
      fulfillment: Host,
    ]
  | [op: 'doReject', vow: HostVow, reason: Host]
  | [
      op: 'doCall',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [
      op: 'doSendOnly',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [
      op: 'doSend',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [op: 'doReturn', callIndex: number, result: Host]
  | [op: 'doThrow', callIndex: number, problem: Host]
  | [
      // ///////////////////// From Guest to Host /////////////////////////
      op: 'checkFulfill',
      vow: HostVow,
      fulfillment: Host,
    ]
  | [op: 'checkReject', vow: HostVow, reason: Host]
  | [
      op: 'checkCall',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [
      op: 'checkSendOnly',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [
      op: 'checkSend',
      target: Host,
      optVerb: PropertyKey | undefined,
      args: Host[],
      callIndex: number,
    ]
  | [op: 'checkReturn', callIndex: number, result: Host]
  | [op: 'checkThrow', callIndex: number, problem: Host];
