/* eslint-disable max-classes-per-file */
import type { Matcher } from '@endo/patterns';

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

declare const typeTag: unique symbol;
export declare type TypedMatcher<T = unknown> = Matcher & {
  readonly [typeTag]: T;
};
export declare type MatcherType<M> = M extends TypedMatcher<infer T>
  ? T
  : unknown;

export declare type MustMatch = <M>(
  specimen: unknown,
  matcher: M,
  label?: string,
) => asserts specimen is MatcherType<M>;
