import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
import {
  PageRequest,
  PageResponse,
} from '../../cosmos/base/query/v1beta1/pagination.js';
export declare const protobufPackage = 'agoric.vstorage';
/** QueryDataRequest is the vstorage path data query. */
export interface QueryDataRequest {
  path: string;
}
/** QueryDataResponse is the vstorage path data response. */
export interface QueryDataResponse {
  value: string;
}
/** QueryCapDataRequest contains a path and formatting configuration. */
export interface QueryCapDataRequest {
  path: string;
  /**
   * mediaType must be an actual media type in the registry at
   * https://www.iana.org/assignments/media-types/media-types.xhtml
   * or a special value that does not conflict with the media type syntax.
   * The only valid value is "JSON Lines", which is also the default.
   */
  mediaType: string;
  /**
   * itemFormat, if present, must be the special value "flat" to indicate that
   * the deep structure of each item should be flattened into a single level
   * with kebab-case keys (e.g., `{ "metrics": { "min": 0, "max": 88 } }` as
   * `{ "metrics-min": 0, "metrics-max": 88 }`).
   */
  itemFormat: string;
  /**
   * remotableValueFormat indicates how to transform references to opaque but
   * distinguishable Remotables into readable embedded representations.
   * * "object" represents each Remotable as an `{ id, allegedName }` object, e.g. `{ "id": "board007", "allegedName": "IST brand" }`.
   * * "string" represents each Remotable as a string with bracket-wrapped contents including its alleged name and id, e.g. "[Alleged: IST brand <board007>]".
   */
  remotableValueFormat: string;
}
/**
 * QueryCapDataResponse represents the result with the requested formatting,
 * reserving space for future metadata such as media type.
 */
export interface QueryCapDataResponse {
  blockHeight: string;
  value: string;
}
/** QueryChildrenRequest is the vstorage path children query. */
export interface QueryChildrenRequest {
  path: string;
  pagination?: PageRequest;
}
/** QueryChildrenResponse is the vstorage path children response. */
export interface QueryChildrenResponse {
  children: string[];
  pagination?: PageResponse;
}
export declare const QueryDataRequest: {
  encode(message: QueryDataRequest, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryDataRequest;
  fromJSON(object: any): QueryDataRequest;
  toJSON(message: QueryDataRequest): unknown;
  fromPartial<
    I extends {
      path?: string | undefined;
    } & {
      path?: string | undefined;
    } & { [K in Exclude<keyof I, 'path'>]: never },
  >(
    object: I,
  ): QueryDataRequest;
};
export declare const QueryDataResponse: {
  encode(message: QueryDataResponse, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryDataResponse;
  fromJSON(object: any): QueryDataResponse;
  toJSON(message: QueryDataResponse): unknown;
  fromPartial<
    I extends {
      value?: string | undefined;
    } & {
      value?: string | undefined;
    } & { [K in Exclude<keyof I, 'value'>]: never },
  >(
    object: I,
  ): QueryDataResponse;
};
export declare const QueryCapDataRequest: {
  encode(message: QueryCapDataRequest, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryCapDataRequest;
  fromJSON(object: any): QueryCapDataRequest;
  toJSON(message: QueryCapDataRequest): unknown;
  fromPartial<
    I extends {
      path?: string | undefined;
      mediaType?: string | undefined;
      itemFormat?: string | undefined;
      remotableValueFormat?: string | undefined;
    } & {
      path?: string | undefined;
      mediaType?: string | undefined;
      itemFormat?: string | undefined;
      remotableValueFormat?: string | undefined;
    } & { [K in Exclude<keyof I, keyof QueryCapDataRequest>]: never },
  >(
    object: I,
  ): QueryCapDataRequest;
};
export declare const QueryCapDataResponse: {
  encode(message: QueryCapDataResponse, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryCapDataResponse;
  fromJSON(object: any): QueryCapDataResponse;
  toJSON(message: QueryCapDataResponse): unknown;
  fromPartial<
    I extends {
      blockHeight?: string | undefined;
      value?: string | undefined;
    } & {
      blockHeight?: string | undefined;
      value?: string | undefined;
    } & { [K in Exclude<keyof I, keyof QueryCapDataResponse>]: never },
  >(
    object: I,
  ): QueryCapDataResponse;
};
export declare const QueryChildrenRequest: {
  encode(message: QueryChildrenRequest, writer?: _m0.Writer): _m0.Writer;
  decode(input: _m0.Reader | Uint8Array, length?: number): QueryChildrenRequest;
  fromJSON(object: any): QueryChildrenRequest;
  toJSON(message: QueryChildrenRequest): unknown;
  fromPartial<
    I extends {
      path?: string | undefined;
      pagination?:
        | {
            key?: Uint8Array | undefined;
            offset?: string | number | Long | undefined;
            limit?: string | number | Long | undefined;
            countTotal?: boolean | undefined;
            reverse?: boolean | undefined;
          }
        | undefined;
    } & {
      path?: string | undefined;
      pagination?:
        | ({
            key?: Uint8Array | undefined;
            offset?: string | number | Long | undefined;
            limit?: string | number | Long | undefined;
            countTotal?: boolean | undefined;
            reverse?: boolean | undefined;
          } & {
            key?: Uint8Array | undefined;
            offset?:
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
                  [K in Exclude<
                    keyof I['pagination']['offset'],
                    keyof Long
                  >]: never;
                })
              | undefined;
            limit?:
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
                  [K_1 in Exclude<
                    keyof I['pagination']['limit'],
                    keyof Long
                  >]: never;
                })
              | undefined;
            countTotal?: boolean | undefined;
            reverse?: boolean | undefined;
          } & {
            [K_2 in Exclude<keyof I['pagination'], keyof PageRequest>]: never;
          })
        | undefined;
    } & { [K_3 in Exclude<keyof I, keyof QueryChildrenRequest>]: never },
  >(
    object: I,
  ): QueryChildrenRequest;
};
export declare const QueryChildrenResponse: {
  encode(message: QueryChildrenResponse, writer?: _m0.Writer): _m0.Writer;
  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): QueryChildrenResponse;
  fromJSON(object: any): QueryChildrenResponse;
  toJSON(message: QueryChildrenResponse): unknown;
  fromPartial<
    I extends {
      children?: string[] | undefined;
      pagination?:
        | {
            nextKey?: Uint8Array | undefined;
            total?: string | number | Long | undefined;
          }
        | undefined;
    } & {
      children?:
        | (string[] &
            string[] & {
              [K in Exclude<keyof I['children'], keyof string[]>]: never;
            })
        | undefined;
      pagination?:
        | ({
            nextKey?: Uint8Array | undefined;
            total?: string | number | Long | undefined;
          } & {
            nextKey?: Uint8Array | undefined;
            total?:
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
                  [K_1 in Exclude<
                    keyof I['pagination']['total'],
                    keyof Long
                  >]: never;
                })
              | undefined;
          } & {
            [K_2 in Exclude<keyof I['pagination'], keyof PageResponse>]: never;
          })
        | undefined;
    } & { [K_3 in Exclude<keyof I, keyof QueryChildrenResponse>]: never },
  >(
    object: I,
  ): QueryChildrenResponse;
};
/** Query defines the gRPC querier service */
export interface Query {
  /** Return the raw string value of an arbitrary vstorage datum. */
  Data(request: QueryDataRequest): Promise<QueryDataResponse>;
  /**
   * Return a formatted representation of a vstorage datum that must be
   * a valid StreamCell with CapData values, or standalone CapData.
   */
  CapData(request: QueryCapDataRequest): Promise<QueryCapDataResponse>;
  /** Return the children of a given vstorage path. */
  Children(request: QueryChildrenRequest): Promise<QueryChildrenResponse>;
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
  Data(request: QueryDataRequest): Promise<QueryDataResponse>;
  CapData(request: QueryCapDataRequest): Promise<QueryCapDataResponse>;
  Children(request: QueryChildrenRequest): Promise<QueryChildrenResponse>;
}
interface Rpc {
  request(
    service: string,
    method: string,
    data: Uint8Array,
  ): Promise<Uint8Array>;
}
type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;
export type DeepPartial<T> = T extends Builtin
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
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & {
      [K in keyof P]: Exact<P[K], I[K]>;
    } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };
export {};
