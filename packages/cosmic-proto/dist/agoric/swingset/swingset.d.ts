import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
import { Coin } from '../../cosmos/base/v1beta1/coin.js';
export declare const protobufPackage = 'agoric.swingset';
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `agoric-sdk/packages/vats/src/core/eval.js`.
 */
export interface CoreEvalProposal {
  title: string;
  description: string;
  /**
   * Although evals are sequential, they may run concurrently, since they each
   * can return a Promise.
   */
  evals: CoreEval[];
}
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 */
export interface CoreEval {
  /**
   * Grant these JSON-stringified core bootstrap permits to the jsCode, as the
   * `powers` endowment.
   */
  jsonPermits: string;
  /**
   * Evaluate this JavaScript code in a Compartment endowed with `powers` as
   * well as some powerless helpers.
   */
  jsCode: string;
}
/** Params are the swingset configuration/governance parameters. */
export interface Params {
  /**
   * Map from unit name to a value in SwingSet "beans".
   * Must not be negative.
   *
   * These values are used by SwingSet to normalize named per-resource charges
   * (maybe rent) in a single Nat usage unit, the "bean".
   *
   * There is no required order to this list of entries, but all the chain
   * nodes must all serialize and deserialize the existing order without
   * permuting it.
   */
  beansPerUnit: StringBeans[];
  /**
   * The price in Coins per the unit named "fee".  This value is used by
   * cosmic-swingset JS code to decide how many tokens to charge.
   *
   * cost = beans_used * fee_unit_price / beans_per_unit["fee"]
   */
  feeUnitPrice: Coin[];
  /**
   * The SwingSet bootstrap vat configuration file.  Not usefully modifiable
   * via governance as it is only referenced by the chain's initial
   * construction.
   */
  bootstrapVatConfig: string;
  /**
   * If the provision submitter doesn't hold a provisionpass, their requested
   * power flags are looked up in this fee menu (first match wins) and the sum
   * is charged.  If any power flag is not found in this menu, the request is
   * rejected.
   */
  powerFlagFees: PowerFlagFee[];
  /**
   * Maximum sizes for queues.
   * These values are used by SwingSet to compute how many messages should be
   * accepted in a block.
   *
   * There is no required order to this list of entries, but all the chain
   * nodes must all serialize and deserialize the existing order without
   * permuting it.
   */
  queueMax: QueueSize[];
}
/** The current state of the module. */
export interface State {
  /**
   * The allowed number of items to add to queues, as determined by SwingSet.
   * Transactions which attempt to enqueue more should be rejected.
   */
  queueAllowed: QueueSize[];
}
/** Map element of a string key to a Nat bean count. */
export interface StringBeans {
  /** What the beans are for. */
  key: string;
  /** The actual bean value. */
  beans: string;
}
/** Map a provisioning power flag to its corresponding fee. */
export interface PowerFlagFee {
  powerFlag: string;
  fee: Coin[];
}
/** Map element of a string key to a size. */
export interface QueueSize {
  /** What the size is for. */
  key: string;
  /** The actual size value. */
  size: number;
}
/** Egress is the format for a swingset egress. */
export interface Egress {
  nickname: string;
  peer: Uint8Array;
  /** TODO: Remove these power flags as they are deprecated and have no effect. */
  powerFlags: string[];
}
export declare const CoreEvalProposal: {
  encode(message: CoreEvalProposal, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): CoreEvalProposal;
  fromJSON(object: any): CoreEvalProposal;
  toJSON(message: CoreEvalProposal): unknown;
  fromPartial<
    I extends {
      title?: string | undefined;
      description?: string | undefined;
      evals?:
        | {
            jsonPermits?: string | undefined;
            jsCode?: string | undefined;
          }[]
        | undefined;
    } & {
      title?: string | undefined;
      description?: string | undefined;
      evals?:
        | ({
            jsonPermits?: string | undefined;
            jsCode?: string | undefined;
          }[] &
            ({
              jsonPermits?: string | undefined;
              jsCode?: string | undefined;
            } & {
              jsonPermits?: string | undefined;
              jsCode?: string | undefined;
            } & {
              [K in Exclude<keyof I['evals'][number], keyof CoreEval>]: never;
            })[] & {
              [K_1 in Exclude<
                keyof I['evals'],
                keyof {
                  jsonPermits?: string | undefined;
                  jsCode?: string | undefined;
                }[]
              >]: never;
            })
        | undefined;
    } & { [K_2 in Exclude<keyof I, keyof CoreEvalProposal>]: never },
  >(
    object: I,
  ): CoreEvalProposal;
};
export declare const CoreEval: {
  encode(message: CoreEval, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): CoreEval;
  fromJSON(object: any): CoreEval;
  toJSON(message: CoreEval): unknown;
  fromPartial<
    I extends {
      jsonPermits?: string | undefined;
      jsCode?: string | undefined;
    } & {
      jsonPermits?: string | undefined;
      jsCode?: string | undefined;
    } & { [K in Exclude<keyof I, keyof CoreEval>]: never },
  >(
    object: I,
  ): CoreEval;
};
export declare const Params: {
  encode(message: Params, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): Params;
  fromJSON(object: any): Params;
  toJSON(message: Params): unknown;
  fromPartial<
    I extends {
      beansPerUnit?:
        | {
            key?: string | undefined;
            beans?: string | undefined;
          }[]
        | undefined;
      feeUnitPrice?:
        | {
            denom?: string | undefined;
            amount?: string | undefined;
          }[]
        | undefined;
      bootstrapVatConfig?: string | undefined;
      powerFlagFees?:
        | {
            powerFlag?: string | undefined;
            fee?:
              | {
                  denom?: string | undefined;
                  amount?: string | undefined;
                }[]
              | undefined;
          }[]
        | undefined;
      queueMax?:
        | {
            key?: string | undefined;
            size?: number | undefined;
          }[]
        | undefined;
    } & {
      beansPerUnit?:
        | ({
            key?: string | undefined;
            beans?: string | undefined;
          }[] &
            ({
              key?: string | undefined;
              beans?: string | undefined;
            } & {
              key?: string | undefined;
              beans?: string | undefined;
            } & {
              [K in Exclude<
                keyof I['beansPerUnit'][number],
                keyof StringBeans
              >]: never;
            })[] & {
              [K_1 in Exclude<
                keyof I['beansPerUnit'],
                keyof {
                  key?: string | undefined;
                  beans?: string | undefined;
                }[]
              >]: never;
            })
        | undefined;
      feeUnitPrice?:
        | ({
            denom?: string | undefined;
            amount?: string | undefined;
          }[] &
            ({
              denom?: string | undefined;
              amount?: string | undefined;
            } & {
              denom?: string | undefined;
              amount?: string | undefined;
            } & {
              [K_2 in Exclude<
                keyof I['feeUnitPrice'][number],
                keyof Coin
              >]: never;
            })[] & {
              [K_3 in Exclude<
                keyof I['feeUnitPrice'],
                keyof {
                  denom?: string | undefined;
                  amount?: string | undefined;
                }[]
              >]: never;
            })
        | undefined;
      bootstrapVatConfig?: string | undefined;
      powerFlagFees?:
        | ({
            powerFlag?: string | undefined;
            fee?:
              | {
                  denom?: string | undefined;
                  amount?: string | undefined;
                }[]
              | undefined;
          }[] &
            ({
              powerFlag?: string | undefined;
              fee?:
                | {
                    denom?: string | undefined;
                    amount?: string | undefined;
                  }[]
                | undefined;
            } & {
              powerFlag?: string | undefined;
              fee?:
                | ({
                    denom?: string | undefined;
                    amount?: string | undefined;
                  }[] &
                    ({
                      denom?: string | undefined;
                      amount?: string | undefined;
                    } & {
                      denom?: string | undefined;
                      amount?: string | undefined;
                    } & {
                      [K_4 in Exclude<
                        keyof I['powerFlagFees'][number]['fee'][number],
                        keyof Coin
                      >]: never;
                    })[] & {
                      [K_5 in Exclude<
                        keyof I['powerFlagFees'][number]['fee'],
                        keyof {
                          denom?: string | undefined;
                          amount?: string | undefined;
                        }[]
                      >]: never;
                    })
                | undefined;
            } & {
              [K_6 in Exclude<
                keyof I['powerFlagFees'][number],
                keyof PowerFlagFee
              >]: never;
            })[] & {
              [K_7 in Exclude<
                keyof I['powerFlagFees'],
                keyof {
                  powerFlag?: string | undefined;
                  fee?:
                    | {
                        denom?: string | undefined;
                        amount?: string | undefined;
                      }[]
                    | undefined;
                }[]
              >]: never;
            })
        | undefined;
      queueMax?:
        | ({
            key?: string | undefined;
            size?: number | undefined;
          }[] &
            ({
              key?: string | undefined;
              size?: number | undefined;
            } & {
              key?: string | undefined;
              size?: number | undefined;
            } & {
              [K_8 in Exclude<
                keyof I['queueMax'][number],
                keyof QueueSize
              >]: never;
            })[] & {
              [K_9 in Exclude<
                keyof I['queueMax'],
                keyof {
                  key?: string | undefined;
                  size?: number | undefined;
                }[]
              >]: never;
            })
        | undefined;
    } & { [K_10 in Exclude<keyof I, keyof Params>]: never },
  >(
    object: I,
  ): Params;
};
export declare const State: {
  encode(message: State, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): State;
  fromJSON(object: any): State;
  toJSON(message: State): unknown;
  fromPartial<
    I extends {
      queueAllowed?:
        | {
            key?: string | undefined;
            size?: number | undefined;
          }[]
        | undefined;
    } & {
      queueAllowed?:
        | ({
            key?: string | undefined;
            size?: number | undefined;
          }[] &
            ({
              key?: string | undefined;
              size?: number | undefined;
            } & {
              key?: string | undefined;
              size?: number | undefined;
            } & {
              [K in Exclude<
                keyof I['queueAllowed'][number],
                keyof QueueSize
              >]: never;
            })[] & {
              [K_1 in Exclude<
                keyof I['queueAllowed'],
                keyof {
                  key?: string | undefined;
                  size?: number | undefined;
                }[]
              >]: never;
            })
        | undefined;
    } & { [K_2 in Exclude<keyof I, 'queueAllowed'>]: never },
  >(
    object: I,
  ): State;
};
export declare const StringBeans: {
  encode(message: StringBeans, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): StringBeans;
  fromJSON(object: any): StringBeans;
  toJSON(message: StringBeans): unknown;
  fromPartial<
    I extends {
      key?: string | undefined;
      beans?: string | undefined;
    } & {
      key?: string | undefined;
      beans?: string | undefined;
    } & { [K in Exclude<keyof I, keyof StringBeans>]: never },
  >(
    object: I,
  ): StringBeans;
};
export declare const PowerFlagFee: {
  encode(message: PowerFlagFee, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): PowerFlagFee;
  fromJSON(object: any): PowerFlagFee;
  toJSON(message: PowerFlagFee): unknown;
  fromPartial<
    I extends {
      powerFlag?: string | undefined;
      fee?:
        | {
            denom?: string | undefined;
            amount?: string | undefined;
          }[]
        | undefined;
    } & {
      powerFlag?: string | undefined;
      fee?:
        | ({
            denom?: string | undefined;
            amount?: string | undefined;
          }[] &
            ({
              denom?: string | undefined;
              amount?: string | undefined;
            } & {
              denom?: string | undefined;
              amount?: string | undefined;
            } & {
              [K in Exclude<keyof I['fee'][number], keyof Coin>]: never;
            })[] & {
              [K_1 in Exclude<
                keyof I['fee'],
                keyof {
                  denom?: string | undefined;
                  amount?: string | undefined;
                }[]
              >]: never;
            })
        | undefined;
    } & { [K_2 in Exclude<keyof I, keyof PowerFlagFee>]: never },
  >(
    object: I,
  ): PowerFlagFee;
};
export declare const QueueSize: {
  encode(message: QueueSize, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueueSize;
  fromJSON(object: any): QueueSize;
  toJSON(message: QueueSize): unknown;
  fromPartial<
    I extends {
      key?: string | undefined;
      size?: number | undefined;
    } & {
      key?: string | undefined;
      size?: number | undefined;
    } & { [K in Exclude<keyof I, keyof QueueSize>]: never },
  >(
    object: I,
  ): QueueSize;
};
export declare const Egress: {
  encode(message: Egress, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): Egress;
  fromJSON(object: any): Egress;
  toJSON(message: Egress): unknown;
  fromPartial<
    I extends {
      nickname?: string | undefined;
      peer?: Uint8Array | undefined;
      powerFlags?: string[] | undefined;
    } & {
      nickname?: string | undefined;
      peer?: Uint8Array | undefined;
      powerFlags?:
        | (string[] &
            string[] & {
              [K in Exclude<keyof I['powerFlags'], keyof string[]>]: never;
            })
        | undefined;
    } & { [K_1 in Exclude<keyof I, keyof Egress>]: never },
  >(
    object: I,
  ): Egress;
};
declare type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;
export declare type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Long
  ? string | number | Long
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? {
      [K in keyof T]?: DeepPartial<T[K]>;
    }
  : Partial<T>;
declare type KeysOfUnion<T> = T extends T ? keyof T : never;
export declare type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & {
      [K in keyof P]: Exact<P[K], I[K]>;
    } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };
export {};
