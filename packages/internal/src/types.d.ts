/* eslint-disable max-classes-per-file */
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

declare global {
  /**
   * Utility for the type of an Exo object once prepared and instantiated.
   */
  type ExoObj<T> = Awaited<ReturnType<Awaited<ReturnType<T>>>>;
}
