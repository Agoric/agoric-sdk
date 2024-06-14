/* eslint-disable max-classes-per-file */
import type { ERef, RemotableBrand } from '@endo/eventual-send';
import type { Primitive } from '@endo/pass-style';
import type { Callable } from './utils.js';

export declare class Callback<I extends (...args: unknown[]) => any> {
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
Returns a boolean for whether the given type is primitive value or primitive type.
 
@example
```
IsPrimitive<'string'>
//=> true
 
IsPrimitive<string>
//=> true
 
IsPrimitive<Object>
//=> false
```
 */
export type IsPrimitive<T> = [T] extends [Primitive] ? true : false;

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

// TODO: Add type tests for FarRef and Remote.
/**
 * Potentially remote promises or settled references.
 */
export type FarRef<Primary, Local = DataOnly<Primary>> = ERef<
  Remote<Primary, Local>
>;
