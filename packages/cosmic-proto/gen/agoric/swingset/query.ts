/* eslint-disable */
import { Params, Egress } from './swingset.js';
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';

export const protobufPackage = 'agoric.swingset';

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

function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}

export const QueryParamsRequest = {
  encode(
    _: QueryParamsRequest,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryParamsRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): QueryParamsRequest {
    return {};
  },

  toJSON(_: QueryParamsRequest): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryParamsRequest>, I>>(
    _: I,
  ): QueryParamsRequest {
    const message = createBaseQueryParamsRequest();
    return message;
  },
};

function createBaseQueryParamsResponse(): QueryParamsResponse {
  return { params: undefined };
}

export const QueryParamsResponse = {
  encode(
    message: QueryParamsResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryParamsResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryParamsResponse {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },

  toJSON(message: QueryParamsResponse): unknown {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryParamsResponse>, I>>(
    object: I,
  ): QueryParamsResponse {
    const message = createBaseQueryParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
};

function createBaseQueryEgressRequest(): QueryEgressRequest {
  return { peer: new Uint8Array() };
}

export const QueryEgressRequest = {
  encode(
    message: QueryEgressRequest,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.peer.length !== 0) {
      writer.uint32(10).bytes(message.peer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryEgressRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEgressRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.peer = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryEgressRequest {
    return {
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
    };
  },

  toJSON(message: QueryEgressRequest): unknown {
    const obj: any = {};
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryEgressRequest>, I>>(
    object: I,
  ): QueryEgressRequest {
    const message = createBaseQueryEgressRequest();
    message.peer = object.peer ?? new Uint8Array();
    return message;
  },
};

function createBaseQueryEgressResponse(): QueryEgressResponse {
  return { egress: undefined };
}

export const QueryEgressResponse = {
  encode(
    message: QueryEgressResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.egress !== undefined) {
      Egress.encode(message.egress, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryEgressResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEgressResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.egress = Egress.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryEgressResponse {
    return {
      egress: isSet(object.egress) ? Egress.fromJSON(object.egress) : undefined,
    };
  },

  toJSON(message: QueryEgressResponse): unknown {
    const obj: any = {};
    message.egress !== undefined &&
      (obj.egress = message.egress ? Egress.toJSON(message.egress) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryEgressResponse>, I>>(
    object: I,
  ): QueryEgressResponse {
    const message = createBaseQueryEgressResponse();
    message.egress =
      object.egress !== undefined && object.egress !== null
        ? Egress.fromPartial(object.egress)
        : undefined;
    return message;
  },
};

function createBaseQueryMailboxRequest(): QueryMailboxRequest {
  return { peer: new Uint8Array() };
}

export const QueryMailboxRequest = {
  encode(
    message: QueryMailboxRequest,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.peer.length !== 0) {
      writer.uint32(10).bytes(message.peer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMailboxRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryMailboxRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.peer = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryMailboxRequest {
    return {
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
    };
  },

  toJSON(message: QueryMailboxRequest): unknown {
    const obj: any = {};
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryMailboxRequest>, I>>(
    object: I,
  ): QueryMailboxRequest {
    const message = createBaseQueryMailboxRequest();
    message.peer = object.peer ?? new Uint8Array();
    return message;
  },
};

function createBaseQueryMailboxResponse(): QueryMailboxResponse {
  return { value: '' };
}

export const QueryMailboxResponse = {
  encode(
    message: QueryMailboxResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.value !== '') {
      writer.uint32(10).string(message.value);
    }
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): QueryMailboxResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryMailboxResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.value = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryMailboxResponse {
    return {
      value: isSet(object.value) ? String(object.value) : '',
    };
  },

  toJSON(message: QueryMailboxResponse): unknown {
    const obj: any = {};
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryMailboxResponse>, I>>(
    object: I,
  ): QueryMailboxResponse {
    const message = createBaseQueryMailboxResponse();
    message.value = object.value ?? '';
    return message;
  },
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

export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.Params = this.Params.bind(this);
    this.Egress = this.Egress.bind(this);
    this.Mailbox = this.Mailbox.bind(this);
  }
  Params(request: QueryParamsRequest): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Query', 'Params', data);
    return promise.then((data) =>
      QueryParamsResponse.decode(new _m0.Reader(data)),
    );
  }

  Egress(request: QueryEgressRequest): Promise<QueryEgressResponse> {
    const data = QueryEgressRequest.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Query', 'Egress', data);
    return promise.then((data) =>
      QueryEgressResponse.decode(new _m0.Reader(data)),
    );
  }

  Mailbox(request: QueryMailboxRequest): Promise<QueryMailboxResponse> {
    const data = QueryMailboxRequest.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Query', 'Mailbox', data);
    return promise.then((data) =>
      QueryMailboxResponse.decode(new _m0.Reader(data)),
    );
  }
}

interface Rpc {
  request(
    service: string,
    method: string,
    data: Uint8Array,
  ): Promise<Uint8Array>;
}

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var globalThis: any = (() => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  throw 'Unable to locate global object';
})();

const atob: (b64: string) => string =
  globalThis.atob ||
  ((b64) => globalThis.Buffer.from(b64, 'base64').toString('binary'));
function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

const btoa: (bin: string) => string =
  globalThis.btoa ||
  ((bin) => globalThis.Buffer.from(bin, 'binary').toString('base64'));
function base64FromBytes(arr: Uint8Array): string {
  const bin: string[] = [];
  arr.forEach((byte) => {
    bin.push(String.fromCharCode(byte));
  });
  return btoa(bin.join(''));
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
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & Record<
        Exclude<keyof I, KeysOfUnion<P>>,
        never
      >;

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
