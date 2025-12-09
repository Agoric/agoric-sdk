/* eslint-disable max-classes-per-file */
import type { ERef, RemotableBrand } from '@endo/eventual-send';
import type { Primitive, RemotableObject } from '@endo/pass-style';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in JSDoc
import type { mustMatch as endoMustMatch, Pattern } from '@endo/patterns';
import type { Callable } from './ses-utils.js';

/**
 * A map corresponding with a total function such that `get(key)` is assumed to
 * always succeed.
 */
export type TotalMap<K, V> = Omit<Map<K, V>, 'get'> & {
  /** Returns the element associated with the specified key in the TotalMap. */
  get: (key: K) => V;
};
export type TotalMapFrom<M extends Map<any, any>> =
  M extends Map<infer K, infer V> ? TotalMap<K, V> : never;

/**
 * A permit is either `true` or a string (both meaning no attenuation, with a
 * string serving as a grouping label for convenience and/or diagram
 * generation), or an object whose keys identify child properties and whose
 * corresponding values are theirselves (recursive) Permits.
 */
export type Permit<T> =
  | true
  | string
  | Partial<{ [K in keyof T]: K extends string ? Permit<T[K]> : never }>;

export type Attenuated<T, P extends Permit<T>> = P extends object
  ? {
      [K in keyof P]: K extends keyof T
        ? P[K] extends Permit<T[K]>
          ? Attenuated<T[K], P[K]>
          : never
        : never;
    }
  : T;

export declare class Callback<I extends (...args: any[]) => any> {
  private iface: I;

  public target: any;

  public methodName?: PropertyKey;

  public bound: unknown[];

  public isSync: boolean;
}

export declare class SyncCallback<
  I extends (...args: unknown[]) => any,
> extends Callback<I> {
  private syncIface: I;

  public isSync: true;
}

/**
 * Returns a boolean for whether the given type is a primitive value or
 * primitive type.
 *
 * @example
 * ```
 * IsPrimitive<'string'>
 * //=> true
 *
 * IsPrimitive<string>
 * //=> true
 *
 * IsPrimitive<Object>
 * //=> false
 */
export type IsPrimitive<T> = [T] extends [Primitive] ? true : false;

// XXX https://github.com/endojs/endo/issues/2979
export type IsRemotable<T> = T extends RemotableObject
  ? true
  : T extends RemotableBrand<any, any>
    ? true
    : false;

/** Recursively extract the non-callable properties of T */
export type DataOnly<T> =
  IsPrimitive<T> extends true
    ? T
    : T extends Callable
      ? never
      : { [P in keyof T as T[P] extends Callable ? never : P]: DataOnly<T[P]> };

/**
 * A type that doesn't assume its parameter is local, but is satisfied with both
 * local and remote references. It accepts both near and marshalled references
 * that were returned from `Remotable` or `Far`.
 */
export type Remote<Primary, Local = DataOnly<Primary>> =
  | Primary
  | RemotableBrand<Local, Primary>;

// TODO: Add type tests for Remote and ERemote.
/**
 * A type that accepts either resolved or promised references that may be either
 * near or marshalled. @see {ERef} and @see {Remote}.
 */
export type ERemote<Primary, Local = DataOnly<Primary>> = ERef<
  Remote<Primary, Local>
>;

/*
 * Stop-gap until https://github.com/Agoric/agoric-sdk/issues/6160
 * explictly specify the type that the Pattern will verify through a match.
 *
 * TODO move all this pattern typing stuff to @endo/patterns
 *
 * CAVEAT: We use a constant string here to avoid exposing a `unique symbol`
 * type publicly, such as with:
 *
 * @example
 *   declare const mySymbol: unique symbol;
 *
 * Without this workaround, we've observed errors when using at least
 * `typescript@5.9.3`'s `tsc` to generate declaration files (.d.ts) for
 * consumers of modules that in turn import the declaration:
 *
 * @example
 *   error TS9006: Declaration emit for this file requires using private name
 *   'tag' from module '.../internal/src/tagged"'. An explicit
 *   type annotation may unblock declaration emit.
 */
// declare const validatedType: unique symbol;
declare const validatedType: 'Symbol(validatedType)';

/**
 * Tag a pattern with the static type it represents.
 */
export type TypedPattern<T> = Pattern & { [validatedType]?: T };

export declare type PatternType<TM extends TypedPattern<any>> =
  TM extends TypedPattern<infer T> ? T : never;

// TODO make Endo's mustMatch do this
/**
 * Returning normally indicates success. Match failure is indicated by
 * throwing.
 *
 * Note: remotables can only be matched as "remotable", not the specific kind.
 *
 * @see {endoMustMatch} for the implementation. This one has a type annotation to narrow if the pattern is a TypedPattern.
 */
export declare type MustMatch = <P extends Pattern>(
  specimen: unknown,
  pattern: P,
  label?: string | number,
) => asserts specimen is P extends TypedPattern<any> ? PatternType<P> : unknown;

export type { TraceLogger } from './debug.js';
