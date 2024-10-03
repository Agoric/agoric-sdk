/* eslint-disable no-use-before-define */
import type { Remote } from '@agoric/internal';
import type { Zone } from '@agoric/zone';
import type { CopyTagged, RemotableObject } from '@endo/pass-style';

/**
 * Return truthy if a rejection reason should result in a retry.
 */
export type IsRetryableReason = (reason: any, priorRetryValue: any) => any;

/**
 * Return type of a function that may
 * return a promise or a vow.
 */
export type PromiseVow<T> = Promise<T | Vow<T>>;

export type ERef<T> = T | PromiseLike<T>;
/**
 * Eventually a value T or Vow for it.
 */
export type EVow<T> = ERef<T | Vow<T>>;

/**
 * Follow the chain of vow shortening to the end, returning the final value.
 * This is used within E, so we must narrow the type to its remote form.
 */
export type EUnwrap<T> =
  T extends Vow<infer U>
    ? EUnwrap<U>
    : T extends PromiseLike<infer U>
      ? EUnwrap<U>
      : T;

/**
 * The first version of the vow implementation
 * object.  CAVEAT: These methods must never be changed or added to, to provide
 * forward/backward compatibility.  Create a new object and bump its version
 * number instead.
 */
export type VowV0<T = any> = {
  /**
   * Attempt to unwrap all vows in this
   * promise chain, returning a promise for the final value.  A rejection may
   * indicate a temporary routing failure requiring a retry, otherwise that the
   * decider of the terminal promise rejected it.
   */
  shorten: () => Promise<T>;
};

export type VowPayload<T = any> = {
  vowV0: RemotableObject & Remote<VowV0<T>>;
};

/**
 * Vows are objects that represent promises that can be stored durably.
 */
export type Vow<T = any> = CopyTagged<'Vow', VowPayload<T>>;

export type VowKit<T = any> = {
  vow: Vow<T>;
  resolver: VowResolver<T>;
};

export type VowResolver<T = any> = {
  resolve(value?: T | PromiseVow<T>): void;
  reject(reason?: any): void;
};

export type Watcher<
  T = any,
  TResult1 = T,
  TResult2 = never,
  C extends any[] = any[],
> = {
  onFulfilled?:
    | ((
        value: T,
        ...args: C
      ) => Vow<TResult1> | PromiseVow<TResult1> | TResult1)
    | undefined;
  onRejected?:
    | ((
        reason: any,
        ...args: C
      ) => Vow<TResult2> | PromiseVow<TResult2> | TResult2)
    | undefined;
};

/**
 * Converts a vow or promise to a promise, ensuring proper handling of ephemeral promises.
 */
export type AsPromiseFunction<
  T = any,
  TResult1 = T,
  TResult2 = never,
  C extends any[] = any[],
> = (
  specimenP: ERef<T | Vow<T>>,
  watcher?: Watcher<T, TResult1, TResult2, C> | undefined,
  watcherArgs?: C | undefined,
) => Promise<TResult1 | TResult2>;

export interface RetryableTool {
  /**
   * Create a function that retries the given function if the underlying
   * async function rejects due to an upgrade disconnection. The return value
   * of the created function is a vow that settles to the final retry result.
   *
   * The retried function should be idempotent.
   *
   * @param fnZone the zone for the named function
   * @param name base name to use in the zone
   * @param fn the retried function
   */
  <F extends (...args: any[]) => Promise<any>>(
    fnZone: Zone,
    name: string,
    fn: F,
  ): F extends (...args: infer Args) => Promise<infer R>
    ? (...args: Args) => Vow<R>
    : never;
}

export type VowTools = {
  /**
   * Vow-tolerant implementation of Promise.all that takes an iterable of vows
   * and other {@link Passable}s and returns a single {@link Vow}. It resolves
   * with an array of values when all of the input's promises or vows are
   * fulfilled and rejects when any of the input's promises or vows are rejected
   * with the first rejection reason.
   */
  all: (maybeVows: unknown[]) => Vow<any[]>;
  /**
   * Vow-tolerant
   * implementation of Promise.allSettled that takes an iterable of vows and other
   * {@link Passable}s and returns a single {@link Vow}. It resolves when all of
   * the input's promises or vows are settled with an array of settled outcome
   * objects.
   */
  allSettled: (maybeVows: unknown[]) => Vow<
    (
      | {
          status: 'fulfilled';
          value: any;
        }
      | {
          status: 'rejected';
          reason: any;
        }
    )[]
  >;
  allVows: (maybeVows: unknown[]) => Vow<any[]>;
  /**
   * Convert a vow or promise to a promise, ensuring proper handling of ephemeral promises.
   */
  asPromise: AsPromiseFunction;
  /**
   * Helper function that
   * coerces the result of a function to a Vow. Helpful for scenarios like a
   * synchronously thrown error.
   */
  asVow: <T extends unknown>(
    fn: (...args: any[]) => Vow<Awaited<T>> | Awaited<T> | PromiseVow<T>,
  ) => Vow<Awaited<T>>;
  makeVowKit: <T>() => VowKit<T>;
  retryable: RetryableTool;
  /**
   * @deprecated use `retryable`
   */
  retriable: RetryableTool;
  watch: <T = any, TResult1 = T, TResult2 = never, C extends any[] = any[]>(
    specimenP: EVow<T>,
    watcher?: Watcher<T, TResult1, TResult2, C> | undefined,
    ...watcherArgs: C
  ) => Vow<
    Exclude<TResult1, void> | Exclude<TResult2, void> extends never
      ? TResult1
      : Exclude<TResult1, void> | Exclude<TResult2, void>
  >;
  /**
   * Shorten `specimenP` until we achieve a final result.
   *
   * Does not survive upgrade (even if specimenP is a durable Vow).
   *
   * Use only if the Vow will resolve _promptly_ {@see {@link  @agoric/swingset-vat/docs/async.md}}.
   */
  when: <T, TResult1 = EUnwrap<T>, TResult2 = never>(
    specimenP: T,
    onFulfilled?:
      | ((value: EUnwrap<T>) => TResult1 | PromiseLike<TResult1>)
      | undefined,
    onRejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined,
  ) => Promise<TResult1 | TResult2>;
};
