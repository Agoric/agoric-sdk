/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';

export const protobufPackage = 'agoric.swingset';

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

function createBaseMsgDeliverInbound(): MsgDeliverInbound {
  return {
    messages: [],
    nums: [],
    ack: Long.UZERO,
    submitter: new Uint8Array(),
  };
}

export const MsgDeliverInbound = {
  encode(
    message: MsgDeliverInbound,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    for (const v of message.messages) {
      writer.uint32(10).string(v!);
    }
    writer.uint32(18).fork();
    for (const v of message.nums) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (!message.ack.isZero()) {
      writer.uint32(24).uint64(message.ack);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(34).bytes(message.submitter);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgDeliverInbound {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDeliverInbound();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.messages.push(reader.string());
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.nums.push(reader.uint64() as Long);
            }
          } else {
            message.nums.push(reader.uint64() as Long);
          }
          break;
        case 3:
          message.ack = reader.uint64() as Long;
          break;
        case 4:
          message.submitter = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgDeliverInbound {
    return {
      messages: Array.isArray(object?.messages)
        ? object.messages.map((e: any) => String(e))
        : [],
      nums: Array.isArray(object?.nums)
        ? object.nums.map((e: any) => Long.fromValue(e))
        : [],
      ack: isSet(object.ack) ? Long.fromValue(object.ack) : Long.UZERO,
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },

  toJSON(message: MsgDeliverInbound): unknown {
    const obj: any = {};
    if (message.messages) {
      obj.messages = message.messages.map((e) => e);
    } else {
      obj.messages = [];
    }
    if (message.nums) {
      obj.nums = message.nums.map((e) => (e || Long.UZERO).toString());
    } else {
      obj.nums = [];
    }
    message.ack !== undefined &&
      (obj.ack = (message.ack || Long.UZERO).toString());
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgDeliverInbound>, I>>(
    object: I,
  ): MsgDeliverInbound {
    const message = createBaseMsgDeliverInbound();
    message.messages = object.messages?.map((e) => e) || [];
    message.nums = object.nums?.map((e) => Long.fromValue(e)) || [];
    message.ack =
      object.ack !== undefined && object.ack !== null
        ? Long.fromValue(object.ack)
        : Long.UZERO;
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
};

function createBaseMsgDeliverInboundResponse(): MsgDeliverInboundResponse {
  return {};
}

export const MsgDeliverInboundResponse = {
  encode(
    _: MsgDeliverInboundResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgDeliverInboundResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDeliverInboundResponse();
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

  fromJSON(_: any): MsgDeliverInboundResponse {
    return {};
  },

  toJSON(_: MsgDeliverInboundResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgDeliverInboundResponse>, I>>(
    _: I,
  ): MsgDeliverInboundResponse {
    const message = createBaseMsgDeliverInboundResponse();
    return message;
  },
};

function createBaseMsgWalletAction(): MsgWalletAction {
  return { owner: new Uint8Array(), action: '' };
}

export const MsgWalletAction = {
  encode(
    message: MsgWalletAction,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.owner.length !== 0) {
      writer.uint32(10).bytes(message.owner);
    }
    if (message.action !== '') {
      writer.uint32(18).string(message.action);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgWalletAction {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletAction();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.bytes();
          break;
        case 2:
          message.action = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgWalletAction {
    return {
      owner: isSet(object.owner)
        ? bytesFromBase64(object.owner)
        : new Uint8Array(),
      action: isSet(object.action) ? String(object.action) : '',
    };
  },

  toJSON(message: MsgWalletAction): unknown {
    const obj: any = {};
    message.owner !== undefined &&
      (obj.owner = base64FromBytes(
        message.owner !== undefined ? message.owner : new Uint8Array(),
      ));
    message.action !== undefined && (obj.action = message.action);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgWalletAction>, I>>(
    object: I,
  ): MsgWalletAction {
    const message = createBaseMsgWalletAction();
    message.owner = object.owner ?? new Uint8Array();
    message.action = object.action ?? '';
    return message;
  },
};

function createBaseMsgWalletActionResponse(): MsgWalletActionResponse {
  return {};
}

export const MsgWalletActionResponse = {
  encode(
    _: MsgWalletActionResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgWalletActionResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletActionResponse();
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

  fromJSON(_: any): MsgWalletActionResponse {
    return {};
  },

  toJSON(_: MsgWalletActionResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgWalletActionResponse>, I>>(
    _: I,
  ): MsgWalletActionResponse {
    const message = createBaseMsgWalletActionResponse();
    return message;
  },
};

function createBaseMsgWalletSpendAction(): MsgWalletSpendAction {
  return { owner: new Uint8Array(), spendAction: '' };
}

export const MsgWalletSpendAction = {
  encode(
    message: MsgWalletSpendAction,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.owner.length !== 0) {
      writer.uint32(10).bytes(message.owner);
    }
    if (message.spendAction !== '') {
      writer.uint32(18).string(message.spendAction);
    }
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgWalletSpendAction {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletSpendAction();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.bytes();
          break;
        case 2:
          message.spendAction = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgWalletSpendAction {
    return {
      owner: isSet(object.owner)
        ? bytesFromBase64(object.owner)
        : new Uint8Array(),
      spendAction: isSet(object.spendAction) ? String(object.spendAction) : '',
    };
  },

  toJSON(message: MsgWalletSpendAction): unknown {
    const obj: any = {};
    message.owner !== undefined &&
      (obj.owner = base64FromBytes(
        message.owner !== undefined ? message.owner : new Uint8Array(),
      ));
    message.spendAction !== undefined &&
      (obj.spendAction = message.spendAction);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgWalletSpendAction>, I>>(
    object: I,
  ): MsgWalletSpendAction {
    const message = createBaseMsgWalletSpendAction();
    message.owner = object.owner ?? new Uint8Array();
    message.spendAction = object.spendAction ?? '';
    return message;
  },
};

function createBaseMsgWalletSpendActionResponse(): MsgWalletSpendActionResponse {
  return {};
}

export const MsgWalletSpendActionResponse = {
  encode(
    _: MsgWalletSpendActionResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgWalletSpendActionResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletSpendActionResponse();
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

  fromJSON(_: any): MsgWalletSpendActionResponse {
    return {};
  },

  toJSON(_: MsgWalletSpendActionResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgWalletSpendActionResponse>, I>>(
    _: I,
  ): MsgWalletSpendActionResponse {
    const message = createBaseMsgWalletSpendActionResponse();
    return message;
  },
};

function createBaseMsgProvision(): MsgProvision {
  return {
    nickname: '',
    address: new Uint8Array(),
    powerFlags: [],
    submitter: new Uint8Array(),
  };
}

export const MsgProvision = {
  encode(
    message: MsgProvision,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.nickname !== '') {
      writer.uint32(10).string(message.nickname);
    }
    if (message.address.length !== 0) {
      writer.uint32(18).bytes(message.address);
    }
    for (const v of message.powerFlags) {
      writer.uint32(26).string(v!);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(34).bytes(message.submitter);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgProvision {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgProvision();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nickname = reader.string();
          break;
        case 2:
          message.address = reader.bytes();
          break;
        case 3:
          message.powerFlags.push(reader.string());
          break;
        case 4:
          message.submitter = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgProvision {
    return {
      nickname: isSet(object.nickname) ? String(object.nickname) : '',
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
      powerFlags: Array.isArray(object?.powerFlags)
        ? object.powerFlags.map((e: any) => String(e))
        : [],
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },

  toJSON(message: MsgProvision): unknown {
    const obj: any = {};
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    if (message.powerFlags) {
      obj.powerFlags = message.powerFlags.map((e) => e);
    } else {
      obj.powerFlags = [];
    }
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgProvision>, I>>(
    object: I,
  ): MsgProvision {
    const message = createBaseMsgProvision();
    message.nickname = object.nickname ?? '';
    message.address = object.address ?? new Uint8Array();
    message.powerFlags = object.powerFlags?.map((e) => e) || [];
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
};

function createBaseMsgProvisionResponse(): MsgProvisionResponse {
  return {};
}

export const MsgProvisionResponse = {
  encode(
    _: MsgProvisionResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgProvisionResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgProvisionResponse();
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

  fromJSON(_: any): MsgProvisionResponse {
    return {};
  },

  toJSON(_: MsgProvisionResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgProvisionResponse>, I>>(
    _: I,
  ): MsgProvisionResponse {
    const message = createBaseMsgProvisionResponse();
    return message;
  },
};

function createBaseMsgInstallBundle(): MsgInstallBundle {
  return { bundle: '', submitter: new Uint8Array() };
}

export const MsgInstallBundle = {
  encode(
    message: MsgInstallBundle,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.bundle !== '') {
      writer.uint32(10).string(message.bundle);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(18).bytes(message.submitter);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgInstallBundle {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstallBundle();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.bundle = reader.string();
          break;
        case 2:
          message.submitter = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgInstallBundle {
    return {
      bundle: isSet(object.bundle) ? String(object.bundle) : '',
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },

  toJSON(message: MsgInstallBundle): unknown {
    const obj: any = {};
    message.bundle !== undefined && (obj.bundle = message.bundle);
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgInstallBundle>, I>>(
    object: I,
  ): MsgInstallBundle {
    const message = createBaseMsgInstallBundle();
    message.bundle = object.bundle ?? '';
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
};

function createBaseMsgInstallBundleResponse(): MsgInstallBundleResponse {
  return {};
}

export const MsgInstallBundleResponse = {
  encode(
    _: MsgInstallBundleResponse,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number,
  ): MsgInstallBundleResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstallBundleResponse();
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

  fromJSON(_: any): MsgInstallBundleResponse {
    return {};
  },

  toJSON(_: MsgInstallBundleResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgInstallBundleResponse>, I>>(
    _: I,
  ): MsgInstallBundleResponse {
    const message = createBaseMsgInstallBundleResponse();
    return message;
  },
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

export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.InstallBundle = this.InstallBundle.bind(this);
    this.DeliverInbound = this.DeliverInbound.bind(this);
    this.WalletAction = this.WalletAction.bind(this);
    this.WalletSpendAction = this.WalletSpendAction.bind(this);
    this.Provision = this.Provision.bind(this);
  }
  InstallBundle(request: MsgInstallBundle): Promise<MsgInstallBundleResponse> {
    const data = MsgInstallBundle.encode(request).finish();
    const promise = this.rpc.request(
      'agoric.swingset.Msg',
      'InstallBundle',
      data,
    );
    return promise.then((data) =>
      MsgInstallBundleResponse.decode(new _m0.Reader(data)),
    );
  }

  DeliverInbound(
    request: MsgDeliverInbound,
  ): Promise<MsgDeliverInboundResponse> {
    const data = MsgDeliverInbound.encode(request).finish();
    const promise = this.rpc.request(
      'agoric.swingset.Msg',
      'DeliverInbound',
      data,
    );
    return promise.then((data) =>
      MsgDeliverInboundResponse.decode(new _m0.Reader(data)),
    );
  }

  WalletAction(request: MsgWalletAction): Promise<MsgWalletActionResponse> {
    const data = MsgWalletAction.encode(request).finish();
    const promise = this.rpc.request(
      'agoric.swingset.Msg',
      'WalletAction',
      data,
    );
    return promise.then((data) =>
      MsgWalletActionResponse.decode(new _m0.Reader(data)),
    );
  }

  WalletSpendAction(
    request: MsgWalletSpendAction,
  ): Promise<MsgWalletSpendActionResponse> {
    const data = MsgWalletSpendAction.encode(request).finish();
    const promise = this.rpc.request(
      'agoric.swingset.Msg',
      'WalletSpendAction',
      data,
    );
    return promise.then((data) =>
      MsgWalletSpendActionResponse.decode(new _m0.Reader(data)),
    );
  }

  Provision(request: MsgProvision): Promise<MsgProvisionResponse> {
    const data = MsgProvision.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Msg', 'Provision', data);
    return promise.then((data) =>
      MsgProvisionResponse.decode(new _m0.Reader(data)),
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
