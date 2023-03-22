/* eslint-disable max-classes-per-file */
export declare class Callback<I extends (...args: unknown[]) => any> {
  private iface: I;

  public target: any;

  public method?: PropertyKey;

  public bound: unknown[];
}

export declare class SyncCallback<
  I extends (...args: unknown[]) => any,
> extends Callback<I> {
  private syncIface: I;
}
