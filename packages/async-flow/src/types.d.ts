import type { Passable } from '@endo/pass-style';
import type { Vow } from '@agoric/vow';
import type { LogStore } from './log-store.js';
import type { Bijection } from './bijection.js';

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

export type HostAsyncFuncWrapper = (...activationArgs: Host[]) => HostVow;

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

/**
 * Convert an entire Guest interface into what the host will implement.
 */
type HostInterface<T> = {
  [K in keyof T]: HostOf<T[K]>;
};

/**
 * The function the host must provide to match an interface the guest expects.
 *
 * Specifically, Promise return values are converted to Vows.
 */
export type HostOf<F> = F extends (...args: infer A) => Promise<infer R>
  ? (...args: A) => Vow<R extends Passable ? R : HostInterface<R>>
  : F;

export type PreparationOptions = {
  vowTools?:
    | {
        when: <
          T,
          TResult1 = import('@agoric/vow').EUnwrap<T>,
          TResult2 = never,
        >(
          specimenP: T,
          onFulfilled?:
            | ((
                value: import('@agoric/vow').EUnwrap<T>,
              ) => TResult1 | PromiseLike<TResult1>)
            | undefined,
          onRejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | undefined,
        ) => Promise<TResult1 | TResult2>;
        watch: <
          T = any,
          TResult1 = T,
          TResult2 = never,
          C extends any[] = any[],
        >(
          specimenP: import('@agoric/vow').EVow<T>,
          watcher?:
            | import('@agoric/vow').Watcher<T, TResult1, TResult2, C>
            | undefined,
          ...watcherArgs: C
        ) => Vow<
          Exclude<TResult1, void> | Exclude<TResult2, void> extends never
            ? TResult1
            : Exclude<TResult1, void> | Exclude<TResult2, void>
        >;
        makeVowKit: <T>() => import('@agoric/vow').VowKit<T>;
        allVows: (
          maybeVows: import('@agoric/vow').EVow<unknown>[],
        ) => Vow<any[]>;
        asVow: <T extends unknown>(
          fn: (
            ...args: any[]
          ) =>
            | Vow<Awaited<T>>
            | Awaited<T>
            | import('@agoric/vow').PromiseVow<T>,
        ) => Vow<Awaited<T>>;
        asPromise: import('@agoric/vow').AsPromiseFunction;
        retriable: <F extends (...args: any[]) => Promise<any>>(
          fnZone: import('@agoric/base-zone').Zone,
          name: string,
          fn: F,
        ) => F extends (...args: infer Args) => Promise<infer R>
          ? (...args: Args) => Vow<R>
          : never;
      }
    | undefined;
  makeLogStore?: (() => LogStore) | undefined;
  makeBijection?: (() => Bijection) | undefined;
  endowmentTools?:
    | {
        prepareEndowment: (
          zone: import('@agoric/base-zone').Zone,
          tag: string,
          e: unknown,
        ) => any;
        unwrap: (wrapped: any, guestWrapped: any) => any;
      }
    | undefined;
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
 * This is the typedef for the membrane log entries we currently implement.
 * See comment below for the commented-out typedef for the full
 * membrane log entry, which we do not yet support.
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
 * This would be the typedef for the full membrane log, if we supported
 * - the guest sending guest-promises and guest-remotables to the host
 * - the guest using `E` to eventual-send to guest wrappers of host
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
