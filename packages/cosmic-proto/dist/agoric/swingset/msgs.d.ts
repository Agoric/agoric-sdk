import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
export declare const protobufPackage = 'agoric.swingset';
/** MsgDeliverInbound defines an SDK message for delivering an eventual send */
export interface MsgDeliverInbound {
  messages: string[];
  nums: Long[];
  ack: Long;
  submitter: Uint8Array;
}
/** MsgDeliverInboundResponse is an empty reply. */
export interface MsgDeliverInboundResponse {}
/**
 * MsgWalletAction defines an SDK message for the on-chain wallet to perform an
 * action that *does not* spend any assets (other than gas fees/stamps).  This
 * message type is typically protected by feegrant budgets.
 */
export interface MsgWalletAction {
  owner: Uint8Array;
  /** The action to perform, as JSON-stringified marshalled data. */
  action: string;
}
/** MsgWalletActionResponse is an empty reply. */
export interface MsgWalletActionResponse {}
/**
 * MsgWalletSpendAction defines an SDK message for the on-chain wallet to
 * perform an action that *does spend the owner's assets.*  This message type is
 * typically protected by explicit confirmation by the user.
 */
export interface MsgWalletSpendAction {
  owner: Uint8Array;
  /** The action to perform, as JSON-stringified marshalled data. */
  spendAction: string;
}
/** MsgWalletSpendActionResponse is an empty reply. */
export interface MsgWalletSpendActionResponse {}
/** MsgProvision defines an SDK message for provisioning a client to the chain */
export interface MsgProvision {
  nickname: string;
  address: Uint8Array;
  powerFlags: string[];
  submitter: Uint8Array;
}
/** MsgProvisionResponse is an empty reply. */
export interface MsgProvisionResponse {}
/** MsgInstallBundle carries a signed bundle to SwingSet. */
export interface MsgInstallBundle {
  bundle: string;
  submitter: Uint8Array;
}
/**
 * MsgInstallBundleResponse is an empty acknowledgement that an install bundle
 * message has been queued for the SwingSet kernel's consideration.
 */
export interface MsgInstallBundleResponse {}
export declare const MsgDeliverInbound: {
  encode(message: MsgDeliverInbound, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgDeliverInbound;
  fromJSON(object: any): MsgDeliverInbound;
  toJSON(message: MsgDeliverInbound): unknown;
  fromPartial<
    I extends {
      messages?: string[] | undefined;
      nums?: (string | number | Long)[] | undefined;
      ack?: string | number | Long | undefined;
      submitter?: Uint8Array | undefined;
    } & {
      messages?:
        | (string[] &
            string[] & {
              [K in Exclude<keyof I['messages'], keyof string[]>]: never;
            })
        | undefined;
      nums?:
        | ((string | number | Long)[] &
            (
              | string
              | number
              | (Long & {
                  high: number;
                  low: number;
                  unsigned: boolean;
                  add: (addend: string | number | Long) => Long;
                  and: (other: string | number | Long) => Long;
                  compare: (other: string | number | Long) => number;
                  comp: (other: string | number | Long) => number;
                  divide: (divisor: string | number | Long) => Long;
                  div: (divisor: string | number | Long) => Long;
                  equals: (other: string | number | Long) => boolean;
                  eq: (other: string | number | Long) => boolean;
                  getHighBits: () => number;
                  getHighBitsUnsigned: () => number;
                  getLowBits: () => number;
                  getLowBitsUnsigned: () => number;
                  getNumBitsAbs: () => number;
                  greaterThan: (other: string | number | Long) => boolean;
                  gt: (other: string | number | Long) => boolean;
                  greaterThanOrEqual: (
                    other: string | number | Long,
                  ) => boolean;
                  gte: (other: string | number | Long) => boolean;
                  ge: (other: string | number | Long) => boolean;
                  isEven: () => boolean;
                  isNegative: () => boolean;
                  isOdd: () => boolean;
                  isPositive: () => boolean;
                  isZero: () => boolean;
                  eqz: () => boolean;
                  lessThan: (other: string | number | Long) => boolean;
                  lt: (other: string | number | Long) => boolean;
                  lessThanOrEqual: (other: string | number | Long) => boolean;
                  lte: (other: string | number | Long) => boolean;
                  le: (other: string | number | Long) => boolean;
                  modulo: (other: string | number | Long) => Long;
                  mod: (other: string | number | Long) => Long;
                  rem: (other: string | number | Long) => Long;
                  multiply: (multiplier: string | number | Long) => Long;
                  mul: (multiplier: string | number | Long) => Long;
                  negate: () => Long;
                  neg: () => Long;
                  not: () => Long;
                  countLeadingZeros: () => number;
                  clz: () => number;
                  countTrailingZeros: () => number;
                  ctz: () => number;
                  notEquals: (other: string | number | Long) => boolean;
                  neq: (other: string | number | Long) => boolean;
                  ne: (other: string | number | Long) => boolean;
                  or: (other: string | number | Long) => Long;
                  shiftLeft: (numBits: number | Long) => Long;
                  shl: (numBits: number | Long) => Long;
                  shiftRight: (numBits: number | Long) => Long;
                  shr: (numBits: number | Long) => Long;
                  shiftRightUnsigned: (numBits: number | Long) => Long;
                  shru: (numBits: number | Long) => Long;
                  shr_u: (numBits: number | Long) => Long;
                  rotateLeft: (numBits: number | Long) => Long;
                  rotl: (numBits: number | Long) => Long;
                  rotateRight: (numBits: number | Long) => Long;
                  rotr: (numBits: number | Long) => Long;
                  subtract: (subtrahend: string | number | Long) => Long;
                  sub: (subtrahend: string | number | Long) => Long;
                  toInt: () => number;
                  toNumber: () => number;
                  toBytes: (le?: boolean | undefined) => number[];
                  toBytesLE: () => number[];
                  toBytesBE: () => number[];
                  toSigned: () => Long;
                  toString: (radix?: number | undefined) => string;
                  toUnsigned: () => Long;
                  xor: (other: string | number | Long) => Long;
                } & {
                  [K_1 in Exclude<keyof I['nums'][number], keyof Long>]: never;
                })
            )[] & {
              [K_2 in Exclude<
                keyof I['nums'],
                keyof (string | number | Long)[]
              >]: never;
            })
        | undefined;
      ack?:
        | string
        | number
        | (Long & {
            high: number;
            low: number;
            unsigned: boolean;
            add: (addend: string | number | Long) => Long;
            and: (other: string | number | Long) => Long;
            compare: (other: string | number | Long) => number;
            comp: (other: string | number | Long) => number;
            divide: (divisor: string | number | Long) => Long;
            div: (divisor: string | number | Long) => Long;
            equals: (other: string | number | Long) => boolean;
            eq: (other: string | number | Long) => boolean;
            getHighBits: () => number;
            getHighBitsUnsigned: () => number;
            getLowBits: () => number;
            getLowBitsUnsigned: () => number;
            getNumBitsAbs: () => number;
            greaterThan: (other: string | number | Long) => boolean;
            gt: (other: string | number | Long) => boolean;
            greaterThanOrEqual: (other: string | number | Long) => boolean;
            gte: (other: string | number | Long) => boolean;
            ge: (other: string | number | Long) => boolean;
            isEven: () => boolean;
            isNegative: () => boolean;
            isOdd: () => boolean;
            isPositive: () => boolean;
            isZero: () => boolean;
            eqz: () => boolean;
            lessThan: (other: string | number | Long) => boolean;
            lt: (other: string | number | Long) => boolean;
            lessThanOrEqual: (other: string | number | Long) => boolean;
            lte: (other: string | number | Long) => boolean;
            le: (other: string | number | Long) => boolean;
            modulo: (other: string | number | Long) => Long;
            mod: (other: string | number | Long) => Long;
            rem: (other: string | number | Long) => Long;
            multiply: (multiplier: string | number | Long) => Long;
            mul: (multiplier: string | number | Long) => Long;
            negate: () => Long;
            neg: () => Long;
            not: () => Long;
            countLeadingZeros: () => number;
            clz: () => number;
            countTrailingZeros: () => number;
            ctz: () => number;
            notEquals: (other: string | number | Long) => boolean;
            neq: (other: string | number | Long) => boolean;
            ne: (other: string | number | Long) => boolean;
            or: (other: string | number | Long) => Long;
            shiftLeft: (numBits: number | Long) => Long;
            shl: (numBits: number | Long) => Long;
            shiftRight: (numBits: number | Long) => Long;
            shr: (numBits: number | Long) => Long;
            shiftRightUnsigned: (numBits: number | Long) => Long;
            shru: (numBits: number | Long) => Long;
            shr_u: (numBits: number | Long) => Long;
            rotateLeft: (numBits: number | Long) => Long;
            rotl: (numBits: number | Long) => Long;
            rotateRight: (numBits: number | Long) => Long;
            rotr: (numBits: number | Long) => Long;
            subtract: (subtrahend: string | number | Long) => Long;
            sub: (subtrahend: string | number | Long) => Long;
            toInt: () => number;
            toNumber: () => number;
            toBytes: (le?: boolean | undefined) => number[];
            toBytesLE: () => number[];
            toBytesBE: () => number[];
            toSigned: () => Long;
            toString: (radix?: number | undefined) => string;
            toUnsigned: () => Long;
            xor: (other: string | number | Long) => Long;
          } & { [K_3 in Exclude<keyof I['ack'], keyof Long>]: never })
        | undefined;
      submitter?: Uint8Array | undefined;
    } & { [K_4 in Exclude<keyof I, keyof MsgDeliverInbound>]: never },
  >(
    object: I,
  ): MsgDeliverInbound;
};
export declare const MsgDeliverInboundResponse: {
  encode(_: MsgDeliverInboundResponse, writer?: _m0.Writer): _m0.Writer;
  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgDeliverInboundResponse;
  fromJSON(_: any): MsgDeliverInboundResponse;
  toJSON(_: MsgDeliverInboundResponse): unknown;
  fromPartial<I extends {} & {} & { [K in Exclude<keyof I, never>]: never }>(
    _: I,
  ): MsgDeliverInboundResponse;
};
export declare const MsgWalletAction: {
  encode(message: MsgWalletAction, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgWalletAction;
  fromJSON(object: any): MsgWalletAction;
  toJSON(message: MsgWalletAction): unknown;
  fromPartial<
    I extends {
      owner?: Uint8Array | undefined;
      action?: string | undefined;
    } & {
      owner?: Uint8Array | undefined;
      action?: string | undefined;
    } & { [K in Exclude<keyof I, keyof MsgWalletAction>]: never },
  >(
    object: I,
  ): MsgWalletAction;
};
export declare const MsgWalletActionResponse: {
  encode(_: MsgWalletActionResponse, writer?: _m0.Writer): _m0.Writer;
  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgWalletActionResponse;
  fromJSON(_: any): MsgWalletActionResponse;
  toJSON(_: MsgWalletActionResponse): unknown;
  fromPartial<I extends {} & {} & { [K in Exclude<keyof I, never>]: never }>(
    _: I,
  ): MsgWalletActionResponse;
};
export declare const MsgWalletSpendAction: {
  encode(message: MsgWalletSpendAction, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgWalletSpendAction;
  fromJSON(object: any): MsgWalletSpendAction;
  toJSON(message: MsgWalletSpendAction): unknown;
  fromPartial<
    I extends {
      owner?: Uint8Array | undefined;
      spendAction?: string | undefined;
    } & {
      owner?: Uint8Array | undefined;
      spendAction?: string | undefined;
    } & { [K in Exclude<keyof I, keyof MsgWalletSpendAction>]: never },
  >(
    object: I,
  ): MsgWalletSpendAction;
};
export declare const MsgWalletSpendActionResponse: {
  encode(_: MsgWalletSpendActionResponse, writer?: _m0.Writer): _m0.Writer;
  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgWalletSpendActionResponse;
  fromJSON(_: any): MsgWalletSpendActionResponse;
  toJSON(_: MsgWalletSpendActionResponse): unknown;
  fromPartial<I extends {} & {} & { [K in Exclude<keyof I, never>]: never }>(
    _: I,
  ): MsgWalletSpendActionResponse;
};
export declare const MsgProvision: {
  encode(message: MsgProvision, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgProvision;
  fromJSON(object: any): MsgProvision;
  toJSON(message: MsgProvision): unknown;
  fromPartial<
    I extends {
      nickname?: string | undefined;
      address?: Uint8Array | undefined;
      powerFlags?: string[] | undefined;
      submitter?: Uint8Array | undefined;
    } & {
      nickname?: string | undefined;
      address?: Uint8Array | undefined;
      powerFlags?:
        | (string[] &
            string[] & {
              [K in Exclude<keyof I['powerFlags'], keyof string[]>]: never;
            })
        | undefined;
      submitter?: Uint8Array | undefined;
    } & { [K_1 in Exclude<keyof I, keyof MsgProvision>]: never },
  >(
    object: I,
  ): MsgProvision;
};
export declare const MsgProvisionResponse: {
  encode(_: MsgProvisionResponse, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgProvisionResponse;
  fromJSON(_: any): MsgProvisionResponse;
  toJSON(_: MsgProvisionResponse): unknown;
  fromPartial<I extends {} & {} & { [K in Exclude<keyof I, never>]: never }>(
    _: I,
  ): MsgProvisionResponse;
};
export declare const MsgInstallBundle: {
  encode(message: MsgInstallBundle, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgInstallBundle;
  fromJSON(object: any): MsgInstallBundle;
  toJSON(message: MsgInstallBundle): unknown;
  fromPartial<
    I extends {
      bundle?: string | undefined;
      submitter?: Uint8Array | undefined;
    } & {
      bundle?: string | undefined;
      submitter?: Uint8Array | undefined;
    } & { [K in Exclude<keyof I, keyof MsgInstallBundle>]: never },
  >(
    object: I,
  ): MsgInstallBundle;
};
export declare const MsgInstallBundleResponse: {
  encode(_: MsgInstallBundleResponse, writer?: _m0.Writer): _m0.Writer;
  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgInstallBundleResponse;
  fromJSON(_: any): MsgInstallBundleResponse;
  toJSON(_: MsgInstallBundleResponse): unknown;
  fromPartial<I extends {} & {} & { [K in Exclude<keyof I, never>]: never }>(
    _: I,
  ): MsgInstallBundleResponse;
};
/** Transactions. */
export interface Msg {
  /** Install a JavaScript sources bundle on the chain's SwingSet controller. */
  InstallBundle(request: MsgInstallBundle): Promise<MsgInstallBundleResponse>;
  /** Send inbound messages. */
  DeliverInbound(
    request: MsgDeliverInbound,
  ): Promise<MsgDeliverInboundResponse>;
  /** Perform a low-privilege wallet action. */
  WalletAction(request: MsgWalletAction): Promise<MsgWalletActionResponse>;
  /** Perform a wallet action that spends assets. */
  WalletSpendAction(
    request: MsgWalletSpendAction,
  ): Promise<MsgWalletSpendActionResponse>;
  /** Provision a new endpoint. */
  Provision(request: MsgProvision): Promise<MsgProvisionResponse>;
}
export declare class MsgClientImpl implements Msg {
  private readonly rpc;
  private readonly service;
  constructor(
    rpc: Rpc,
    opts?: {
      service?: string;
    },
  );
  InstallBundle(request: MsgInstallBundle): Promise<MsgInstallBundleResponse>;
  DeliverInbound(
    request: MsgDeliverInbound,
  ): Promise<MsgDeliverInboundResponse>;
  WalletAction(request: MsgWalletAction): Promise<MsgWalletActionResponse>;
  WalletSpendAction(
    request: MsgWalletSpendAction,
  ): Promise<MsgWalletSpendActionResponse>;
  Provision(request: MsgProvision): Promise<MsgProvisionResponse>;
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
