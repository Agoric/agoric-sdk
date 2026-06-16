/* eslint-disable max-classes-per-file */
import type { ERef, RemotableBrand } from '@endo/eventual-send';
import type { Primitive, RemotableObject } from '@endo/pass-style';
import type { CastedPattern } from '@endo/patterns';

import type { CastedPattern } from '@endo/patterns';
import type { Callable } from './ses-utils.js';

/**
 * A mapping of a tuple type (as from `Parameters<...>`) into a corresponding
 * object type with named fields.
 *
 * @example
 * ```
 * RecordFromTuple<[string, bigint], ['denom', 'amount']>
 * //=> { denom: string, amount: bigint }
 * ```
 */
export type RecordFromTuple<
  Types extends readonly unknown[],
  Names extends Record<Exclude<keyof Types, keyof unknown[]>, string>,
> = { [K in Exclude<keyof Types, keyof any[]> as Names[K]]: Types[K] };

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

/**
 * Tag a pattern with the static type it represents. Endo's `mustMatch` and
 * `matches` narrow a specimen to this type.
 *
 * @deprecated Use {@link CastedPattern} from `@endo/patterns` directly.
 */
export type TypedPattern<T> = CastedPattern<T>;

export type { TraceLogger } from './debug.js';
