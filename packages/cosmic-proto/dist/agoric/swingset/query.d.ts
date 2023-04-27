import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
import { Egress, Params } from './swingset.js';
export declare const protobufPackage = 'agoric.swingset';
/** QueryParamsRequest is the request type for the Query/Params RPC method. */
export interface QueryParamsRequest {}
/** QueryParamsResponse is the response type for the Query/Params RPC method. */
export interface QueryParamsResponse {
  /** params defines the parameters of the module. */
  params?: Params;
}
/** QueryEgressRequest is the request type for the Query/Egress RPC method */
export interface QueryEgressRequest {
  peer: Uint8Array;
}
/** QueryEgressResponse is the egress response. */
export interface QueryEgressResponse {
  egress?: Egress;
}
/** QueryMailboxRequest is the mailbox query. */
export interface QueryMailboxRequest {
  peer: Uint8Array;
}
/** QueryMailboxResponse is the mailbox response. */
export interface QueryMailboxResponse {
  value: string;
}
export declare const QueryParamsRequest: {
  encode(_: QueryParamsRequest, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryParamsRequest;
  fromJSON(_: any): QueryParamsRequest;
  toJSON(_: QueryParamsRequest): unknown;
  fromPartial<I extends {} & {} & { [K in Exclude<keyof I, never>]: never }>(
    _: I,
  ): QueryParamsRequest;
};
export declare const QueryParamsResponse: {
  encode(message: QueryParamsResponse, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryParamsResponse;
  fromJSON(object: any): QueryParamsResponse;
  toJSON(message: QueryParamsResponse): unknown;
  fromPartial<
    I extends {
      params?:
        | {
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
          }
        | undefined;
    } & {
      params?:
        | ({
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
                      keyof I['params']['beansPerUnit'][number],
                      keyof import('./swingset.js').StringBeans
                    >]: never;
                  })[] & {
                    [K_1 in Exclude<
                      keyof I['params']['beansPerUnit'],
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
                      keyof I['params']['feeUnitPrice'][number],
                      keyof import('../../cosmos/base/v1beta1/coin.js').Coin
                    >]: never;
                  })[] & {
                    [K_3 in Exclude<
                      keyof I['params']['feeUnitPrice'],
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
                              keyof I['params']['powerFlagFees'][number]['fee'][number],
                              keyof import('../../cosmos/base/v1beta1/coin.js').Coin
                            >]: never;
                          })[] & {
                            [K_5 in Exclude<
                              keyof I['params']['powerFlagFees'][number]['fee'],
                              keyof {
                                denom?: string | undefined;
                                amount?: string | undefined;
                              }[]
                            >]: never;
                          })
                      | undefined;
                  } & {
                    [K_6 in Exclude<
                      keyof I['params']['powerFlagFees'][number],
                      keyof import('./swingset.js').PowerFlagFee
                    >]: never;
                  })[] & {
                    [K_7 in Exclude<
                      keyof I['params']['powerFlagFees'],
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
                      keyof I['params']['queueMax'][number],
                      keyof import('./swingset.js').QueueSize
                    >]: never;
                  })[] & {
                    [K_9 in Exclude<
                      keyof I['params']['queueMax'],
                      keyof {
                        key?: string | undefined;
                        size?: number | undefined;
                      }[]
                    >]: never;
                  })
              | undefined;
          } & { [K_10 in Exclude<keyof I['params'], keyof Params>]: never })
        | undefined;
    } & { [K_11 in Exclude<keyof I, 'params'>]: never },
  >(
    object: I,
  ): QueryParamsResponse;
};
export declare const QueryEgressRequest: {
  encode(message: QueryEgressRequest, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryEgressRequest;
  fromJSON(object: any): QueryEgressRequest;
  toJSON(message: QueryEgressRequest): unknown;
  fromPartial<
    I extends {
      peer?: Uint8Array | undefined;
    } & {
      peer?: Uint8Array | undefined;
    } & { [K in Exclude<keyof I, 'peer'>]: never },
  >(
    object: I,
  ): QueryEgressRequest;
};
export declare const QueryEgressResponse: {
  encode(message: QueryEgressResponse, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryEgressResponse;
  fromJSON(object: any): QueryEgressResponse;
  toJSON(message: QueryEgressResponse): unknown;
  fromPartial<
    I extends {
      egress?:
        | {
            nickname?: string | undefined;
            peer?: Uint8Array | undefined;
            powerFlags?: string[] | undefined;
          }
        | undefined;
    } & {
      egress?:
        | ({
            nickname?: string | undefined;
            peer?: Uint8Array | undefined;
            powerFlags?: string[] | undefined;
          } & {
            nickname?: string | undefined;
            peer?: Uint8Array | undefined;
            powerFlags?:
              | (string[] &
                  string[] & {
                    [K in Exclude<
                      keyof I['egress']['powerFlags'],
                      keyof string[]
                    >]: never;
                  })
              | undefined;
          } & { [K_1 in Exclude<keyof I['egress'], keyof Egress>]: never })
        | undefined;
    } & { [K_2 in Exclude<keyof I, 'egress'>]: never },
  >(
    object: I,
  ): QueryEgressResponse;
};
export declare const QueryMailboxRequest: {
  encode(message: QueryMailboxRequest, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMailboxRequest;
  fromJSON(object: any): QueryMailboxRequest;
  toJSON(message: QueryMailboxRequest): unknown;
  fromPartial<
    I extends {
      peer?: Uint8Array | undefined;
    } & {
      peer?: Uint8Array | undefined;
    } & { [K in Exclude<keyof I, 'peer'>]: never },
  >(
    object: I,
  ): QueryMailboxRequest;
};
export declare const QueryMailboxResponse: {
  encode(message: QueryMailboxResponse, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMailboxResponse;
  fromJSON(object: any): QueryMailboxResponse;
  toJSON(message: QueryMailboxResponse): unknown;
  fromPartial<
    I extends {
      value?: string | undefined;
    } & {
      value?: string | undefined;
    } & { [K in Exclude<keyof I, 'value'>]: never },
  >(
    object: I,
  ): QueryMailboxResponse;
};
/** Query provides defines the gRPC querier service */
export interface Query {
  /** Params queries params of the swingset module. */
  Params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
  /** Egress queries a provisioned egress. */
  Egress(request: QueryEgressRequest): Promise<QueryEgressResponse>;
  /** Return the contents of a peer's outbound mailbox. */
  Mailbox(request: QueryMailboxRequest): Promise<QueryMailboxResponse>;
}
export declare class QueryClientImpl implements Query {
  private readonly rpc;
  private readonly service;
  constructor(
    rpc: Rpc,
    opts?: {
      service?: string;
    },
  );
  Params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
  Egress(request: QueryEgressRequest): Promise<QueryEgressResponse>;
  Mailbox(request: QueryMailboxRequest): Promise<QueryMailboxResponse>;
}
interface Rpc {
  request(
    service: string,
    method: string,
    data: Uint8Array,
  ): Promise<Uint8Array>;
}
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
