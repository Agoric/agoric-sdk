/* eslint-disable no-shadow,no-use-before-define,no-var,vars-on-top */
// Type definitions for eventual-send

// Sourced from Endo (and edited)

// TODO adopt symbol after https://github.com/endojs/endo/issues/1035 and eventual-send lives in Endo only
// declare const RemoteTag: unique symbol;
// For now maintain compatibility with @endo/marshal that is using '__Remote__' literal
declare const RemoteTag: '__Remote__';
export interface Remotable<T> {
  [RemoteTag]: T;
}

export type Callable = (...args: any[]) => any;

export type ERef<T> = PromiseLike<T> | T;

// Type for an object that must only be invoked with E.  It supports a given
// interface but declares all the functions as asyncable.
export type EOnly<T> = T extends (...args: infer P) => infer R
  ? (...args: P) => ERef<R> | EOnly<R>
  : T extends Record<PropertyKey, Callable>
  ? ERef<{
      [K in keyof T]: EOnly<T[K]>;
    }>
  : ERef<T>;

export type FilteredKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];

export type DataOnly<T> = Omit<T, FilteredKeys<T, Callable>>;
export type FunctionOnly<T> = Pick<T, FilteredKeys<T, Callable>> &
  (T extends Callable ? (...args: Parameters<T>) => ReturnType<T> : {});
export type Remote<Primary, Local = DataOnly<Primary>> = ERef<
  Local & Remotable<Primary>
>;

export type RemoteFunctions<T> = T extends Remotable<infer U>
  ? FunctionOnly<U>
  : Awaited<T> extends Remotable<infer U>
  ? FunctionOnly<U>
  : Awaited<T>;

export type PromisedData<T> = T extends Remotable<infer U>
  ? DataOnly<U>
  : Awaited<T> extends Remotable<infer U>
  ? DataOnly<U>
  : Awaited<T>;

export interface EHandler<T> {
  get?: (p: T, name: PropertyKey, returnedP?: Promise<unknown>) => unknown;
  getSendOnly?: (p: T, name: PropertyKey) => void;
  applyFunction?: (
    p: T,
    args: unknown[],
    returnedP?: Promise<unknown>,
  ) => unknown;
  applyFunctionSendOnly?: (p: T, args: unknown[]) => void;
  applyMethod?: (
    p: T,
    name: PropertyKey | undefined,
    args: unknown[],
    returnedP?: Promise<unknown>,
  ) => unknown;
  applyMethodSendOnly?: (
    p: T,
    name: PropertyKey | undefined,
    args: unknown[],
  ) => void;
}

export type HandledExecutor<R> = (
  resolveHandled: (value?: R) => void,
  rejectHandled: (reason?: unknown) => void,
  resolveWithPresence: (
    presenceHandler: EHandler<{}>,
    options?: ResolveWithPresenceOptionsBag<{}>,
  ) => object,
) => void;

export type ResolveWithPresenceOptionsBag<T extends Object> = {
  proxy?: {
    handler: ProxyHandler<T>;
    target: unknown;
    revokerCallback?: (revoker: () => void) => void;
  };
};

export interface HandledPromiseStaticMethods {
  resolve(): Promise<void>;
  resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  applyFunction(target: unknown, args: unknown[]): Promise<unknown>;
  applyFunctionSendOnly(target: unknown, args: unknown[]): void;
  applyMethod(
    target: unknown,
    prop: PropertyKey | undefined,
    args: unknown[],
  ): Promise<unknown>;
  applyMethodSendOnly(
    target: unknown,
    prop: PropertyKey,
    args: unknown[],
  ): void;
  get(target: unknown, prop: PropertyKey): Promise<unknown>;
  getSendOnly(target: unknown, prop: PropertyKey): void;
}

export interface HandledPromiseConstructor
  extends PromiseConstructor,
    HandledPromiseStaticMethods {
  new <R>(
    executor: HandledExecutor<R>,
    unfulfilledHandler?: EHandler<Promise<unknown>>,
  ): Promise<R>;
  prototype: Promise<unknown>;
}

export declare const HandledPromise: HandledPromiseConstructor;

declare namespace global {
  var HandledPromise: HandledPromiseConstructor;
}

/**
 * "E" short for "Eventual", what we call something that has to return a promise.
 */
type ECallable<T extends Callable> = ReturnType<T> extends Promise<infer U>
  ? // function already returns a promise
    T
  : // make it return a promise
    (...args: Parameters<T>) => Promise<ReturnType<T>>;

/* Types for E proxy calls. */

/**
 * Ensure each function in T returns a promise
 */
type EMethods<T> = {
  readonly [P in keyof T]: ECallable<T[P]>;
};

type EGetters<T> = {
  readonly [P in keyof T]: Promise<Awaited<T[P]>>;
};

/* Same types for send-only. */
type ESingleMethodOnly<T> = {
  readonly [P in keyof T]: T[P] extends Callable
    ? (...args: Parameters<T[P]>) => void
    : never;
};
type ESingleCallOnly<T> = T extends Callable
  ? ((...args: Parameters<T>) => void) & ESingleMethodOnly<T>
  : ESingleMethodOnly<T>;
type ESingleGetOnly<T> = {
  readonly [P in keyof T]: void;
};

interface ESendOnly {
  <T>(x: T): ESingleCallOnly<Awaited<T>>;
}

// Generic on the proxy target {T}
interface EProxy {
  /**
   * E(x) returns a proxy on which you can call arbitrary methods. Each of
   * these method calls returns a promise. The method will be invoked on
   * whatever 'x' designates (or resolves to) in a future turn, not this
   * one.
   *
   * @param x target for method/function call
   * @returns method/function call proxy
   */
  // T is an object of methods
  <T>(x: T): EMethods<Required<RemoteFunctions<T>>>;
  /**
   * T is callable, but may still contain methods. E.g.,
   * const a = () => 'primary';
   * a.foo = () => 'nested';
   */
  <T extends Callable>(x: T): ECallable<T> & EMethods<Required<T>>;

  /**
   * E.get(x) returns a proxy on which you can get arbitrary properties.
   * Each of these properties returns a promise for the property.  The promise
   * value will be the property fetched from whatever 'x' designates (or
   * resolves to) in a future turn, not this one.
   *
   * @param x target for property get
   * @returns property get proxy
   */
  readonly get: <T>(x: T) => EGetters<PromisedData<T>>;

  /**
   * E.resolve(x) converts x to a handled promise. It is
   * shorthand for HandledPromise.resolve(x)
   */
  readonly resolve: <T>(x: T) => Promise<Awaited<T>>;

  /**
   * E.when(x, res, rej) is equivalent to
   * HandledPromise.resolve(x).then(res, rej)
   */
  readonly when: <T, U>(
    x: T,
    onfulfilled?: (value: Awaited<T>) => ERef<U>,
    onrejected?: (reason: any) => ERef<U>,
  ) => Promise<U>;

  /**
   * E.sendOnly returns a proxy similar to E, but for which the results
   * are ignored (undefined is returned).
   */
  readonly sendOnly: ESendOnly;
}

export const E: EProxy;
