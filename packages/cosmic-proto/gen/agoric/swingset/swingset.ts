/* eslint-disable */
import Long from 'long';
import { Coin } from '../../cosmos/base/v1beta1/coin.js';
import _m0 from 'protobufjs/minimal.js';

export const protobufPackage = 'agoric.swingset';

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

function createBaseCoreEvalProposal(): CoreEvalProposal {
  return { title: '', description: '', evals: [] };
}

export const CoreEvalProposal = {
  encode(
    message: CoreEvalProposal,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.title !== '') {
      writer.uint32(10).string(message.title);
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description);
    }
    for (const v of message.evals) {
      CoreEval.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CoreEvalProposal {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoreEvalProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.title = reader.string();
          break;
        case 2:
          message.description = reader.string();
          break;
        case 3:
          message.evals.push(CoreEval.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): CoreEvalProposal {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      evals: Array.isArray(object?.evals)
        ? object.evals.map((e: any) => CoreEval.fromJSON(e))
        : [],
    };
  },

  toJSON(message: CoreEvalProposal): unknown {
    const obj: any = {};
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined &&
      (obj.description = message.description);
    if (message.evals) {
      obj.evals = message.evals.map((e) =>
        e ? CoreEval.toJSON(e) : undefined,
      );
    } else {
      obj.evals = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<CoreEvalProposal>, I>>(
    object: I,
  ): CoreEvalProposal {
    const message = createBaseCoreEvalProposal();
    message.title = object.title ?? '';
    message.description = object.description ?? '';
    message.evals = object.evals?.map((e) => CoreEval.fromPartial(e)) || [];
    return message;
  },
};

function createBaseCoreEval(): CoreEval {
  return { jsonPermits: '', jsCode: '' };
}

export const CoreEval = {
  encode(
    message: CoreEval,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.jsonPermits !== '') {
      writer.uint32(10).string(message.jsonPermits);
    }
    if (message.jsCode !== '') {
      writer.uint32(18).string(message.jsCode);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CoreEval {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoreEval();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.jsonPermits = reader.string();
          break;
        case 2:
          message.jsCode = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): CoreEval {
    return {
      jsonPermits: isSet(object.jsonPermits) ? String(object.jsonPermits) : '',
      jsCode: isSet(object.jsCode) ? String(object.jsCode) : '',
    };
  },

  toJSON(message: CoreEval): unknown {
    const obj: any = {};
    message.jsonPermits !== undefined &&
      (obj.jsonPermits = message.jsonPermits);
    message.jsCode !== undefined && (obj.jsCode = message.jsCode);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<CoreEval>, I>>(object: I): CoreEval {
    const message = createBaseCoreEval();
    message.jsonPermits = object.jsonPermits ?? '';
    message.jsCode = object.jsCode ?? '';
    return message;
  },
};

function createBaseParams(): Params {
  return {
    beansPerUnit: [],
    feeUnitPrice: [],
    bootstrapVatConfig: '',
    powerFlagFees: [],
    queueMax: [],
  };
}

export const Params = {
  encode(
    message: Params,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    for (const v of message.beansPerUnit) {
      StringBeans.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.feeUnitPrice) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.bootstrapVatConfig !== '') {
      writer.uint32(26).string(message.bootstrapVatConfig);
    }
    for (const v of message.powerFlagFees) {
      PowerFlagFee.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.queueMax) {
      QueueSize.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Params {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.beansPerUnit.push(
            StringBeans.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.feeUnitPrice.push(Coin.decode(reader, reader.uint32()));
          break;
        case 3:
          message.bootstrapVatConfig = reader.string();
          break;
        case 4:
          message.powerFlagFees.push(
            PowerFlagFee.decode(reader, reader.uint32()),
          );
          break;
        case 5:
          message.queueMax.push(QueueSize.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Params {
    return {
      beansPerUnit: Array.isArray(object?.beansPerUnit)
        ? object.beansPerUnit.map((e: any) => StringBeans.fromJSON(e))
        : [],
      feeUnitPrice: Array.isArray(object?.feeUnitPrice)
        ? object.feeUnitPrice.map((e: any) => Coin.fromJSON(e))
        : [],
      bootstrapVatConfig: isSet(object.bootstrapVatConfig)
        ? String(object.bootstrapVatConfig)
        : '',
      powerFlagFees: Array.isArray(object?.powerFlagFees)
        ? object.powerFlagFees.map((e: any) => PowerFlagFee.fromJSON(e))
        : [],
      queueMax: Array.isArray(object?.queueMax)
        ? object.queueMax.map((e: any) => QueueSize.fromJSON(e))
        : [],
    };
  },

  toJSON(message: Params): unknown {
    const obj: any = {};
    if (message.beansPerUnit) {
      obj.beansPerUnit = message.beansPerUnit.map((e) =>
        e ? StringBeans.toJSON(e) : undefined,
      );
    } else {
      obj.beansPerUnit = [];
    }
    if (message.feeUnitPrice) {
      obj.feeUnitPrice = message.feeUnitPrice.map((e) =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.feeUnitPrice = [];
    }
    message.bootstrapVatConfig !== undefined &&
      (obj.bootstrapVatConfig = message.bootstrapVatConfig);
    if (message.powerFlagFees) {
      obj.powerFlagFees = message.powerFlagFees.map((e) =>
        e ? PowerFlagFee.toJSON(e) : undefined,
      );
    } else {
      obj.powerFlagFees = [];
    }
    if (message.queueMax) {
      obj.queueMax = message.queueMax.map((e) =>
        e ? QueueSize.toJSON(e) : undefined,
      );
    } else {
      obj.queueMax = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<Params>, I>>(object: I): Params {
    const message = createBaseParams();
    message.beansPerUnit =
      object.beansPerUnit?.map((e) => StringBeans.fromPartial(e)) || [];
    message.feeUnitPrice =
      object.feeUnitPrice?.map((e) => Coin.fromPartial(e)) || [];
    message.bootstrapVatConfig = object.bootstrapVatConfig ?? '';
    message.powerFlagFees =
      object.powerFlagFees?.map((e) => PowerFlagFee.fromPartial(e)) || [];
    message.queueMax =
      object.queueMax?.map((e) => QueueSize.fromPartial(e)) || [];
    return message;
  },
};

function createBaseState(): State {
  return { queueAllowed: [] };
}

export const State = {
  encode(message: State, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.queueAllowed) {
      QueueSize.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): State {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.queueAllowed.push(QueueSize.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): State {
    return {
      queueAllowed: Array.isArray(object?.queueAllowed)
        ? object.queueAllowed.map((e: any) => QueueSize.fromJSON(e))
        : [],
    };
  },

  toJSON(message: State): unknown {
    const obj: any = {};
    if (message.queueAllowed) {
      obj.queueAllowed = message.queueAllowed.map((e) =>
        e ? QueueSize.toJSON(e) : undefined,
      );
    } else {
      obj.queueAllowed = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<State>, I>>(object: I): State {
    const message = createBaseState();
    message.queueAllowed =
      object.queueAllowed?.map((e) => QueueSize.fromPartial(e)) || [];
    return message;
  },
};

function createBaseStringBeans(): StringBeans {
  return { key: '', beans: '' };
}

export const StringBeans = {
  encode(
    message: StringBeans,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.beans !== '') {
      writer.uint32(18).string(message.beans);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StringBeans {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStringBeans();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.beans = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): StringBeans {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      beans: isSet(object.beans) ? String(object.beans) : '',
    };
  },

  toJSON(message: StringBeans): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.beans !== undefined && (obj.beans = message.beans);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<StringBeans>, I>>(
    object: I,
  ): StringBeans {
    const message = createBaseStringBeans();
    message.key = object.key ?? '';
    message.beans = object.beans ?? '';
    return message;
  },
};

function createBasePowerFlagFee(): PowerFlagFee {
  return { powerFlag: '', fee: [] };
}

export const PowerFlagFee = {
  encode(
    message: PowerFlagFee,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.powerFlag !== '') {
      writer.uint32(10).string(message.powerFlag);
    }
    for (const v of message.fee) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PowerFlagFee {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePowerFlagFee();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.powerFlag = reader.string();
          break;
        case 2:
          message.fee.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PowerFlagFee {
    return {
      powerFlag: isSet(object.powerFlag) ? String(object.powerFlag) : '',
      fee: Array.isArray(object?.fee)
        ? object.fee.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },

  toJSON(message: PowerFlagFee): unknown {
    const obj: any = {};
    message.powerFlag !== undefined && (obj.powerFlag = message.powerFlag);
    if (message.fee) {
      obj.fee = message.fee.map((e) => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.fee = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PowerFlagFee>, I>>(
    object: I,
  ): PowerFlagFee {
    const message = createBasePowerFlagFee();
    message.powerFlag = object.powerFlag ?? '';
    message.fee = object.fee?.map((e) => Coin.fromPartial(e)) || [];
    return message;
  },
};

function createBaseQueueSize(): QueueSize {
  return { key: '', size: 0 };
}

export const QueueSize = {
  encode(
    message: QueueSize,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.size !== 0) {
      writer.uint32(16).int32(message.size);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueueSize {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueueSize();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.size = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueueSize {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      size: isSet(object.size) ? Number(object.size) : 0,
    };
  },

  toJSON(message: QueueSize): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.size !== undefined && (obj.size = Math.round(message.size));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueueSize>, I>>(
    object: I,
  ): QueueSize {
    const message = createBaseQueueSize();
    message.key = object.key ?? '';
    message.size = object.size ?? 0;
    return message;
  },
};

function createBaseEgress(): Egress {
  return { nickname: '', peer: new Uint8Array(), powerFlags: [] };
}

export const Egress = {
  encode(
    message: Egress,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.nickname !== '') {
      writer.uint32(10).string(message.nickname);
    }
    if (message.peer.length !== 0) {
      writer.uint32(18).bytes(message.peer);
    }
    for (const v of message.powerFlags) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Egress {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEgress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nickname = reader.string();
          break;
        case 2:
          message.peer = reader.bytes();
          break;
        case 3:
          message.powerFlags.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Egress {
    return {
      nickname: isSet(object.nickname) ? String(object.nickname) : '',
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
      powerFlags: Array.isArray(object?.powerFlags)
        ? object.powerFlags.map((e: any) => String(e))
        : [],
    };
  },

  toJSON(message: Egress): unknown {
    const obj: any = {};
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    if (message.powerFlags) {
      obj.powerFlags = message.powerFlags.map((e) => e);
    } else {
      obj.powerFlags = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<Egress>, I>>(object: I): Egress {
    const message = createBaseEgress();
    message.nickname = object.nickname ?? '';
    message.peer = object.peer ?? new Uint8Array();
    message.powerFlags = object.powerFlags?.map((e) => e) || [];
    return message;
  },
};

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
