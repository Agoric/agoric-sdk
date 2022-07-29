/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal';

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

const baseMsgDeliverInbound: object = {
  messages: '',
  nums: Long.UZERO,
  ack: Long.UZERO,
};

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
    const message = { ...baseMsgDeliverInbound } as MsgDeliverInbound;
    message.messages = [];
    message.nums = [];
    message.submitter = new Uint8Array();
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
    const message = { ...baseMsgDeliverInbound } as MsgDeliverInbound;
    message.messages = [];
    message.nums = [];
    message.submitter = new Uint8Array();
    if (object.messages !== undefined && object.messages !== null) {
      for (const e of object.messages) {
        message.messages.push(String(e));
      }
    }
    if (object.nums !== undefined && object.nums !== null) {
      for (const e of object.nums) {
        message.nums.push(Long.fromString(e));
      }
    }
    if (object.ack !== undefined && object.ack !== null) {
      message.ack = Long.fromString(object.ack);
    } else {
      message.ack = Long.UZERO;
    }
    if (object.submitter !== undefined && object.submitter !== null) {
      message.submitter = bytesFromBase64(object.submitter);
    }
    return message;
  },

  toJSON(message: MsgDeliverInbound): unknown {
    const obj: any = {};
    if (message.messages) {
      obj.messages = message.messages.map(e => e);
    } else {
      obj.messages = [];
    }
    if (message.nums) {
      obj.nums = message.nums.map(e => (e || Long.UZERO).toString());
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

  fromPartial(object: DeepPartial<MsgDeliverInbound>): MsgDeliverInbound {
    const message = { ...baseMsgDeliverInbound } as MsgDeliverInbound;
    message.messages = [];
    message.nums = [];
    if (object.messages !== undefined && object.messages !== null) {
      for (const e of object.messages) {
        message.messages.push(e);
      }
    }
    if (object.nums !== undefined && object.nums !== null) {
      for (const e of object.nums) {
        message.nums.push(e);
      }
    }
    if (object.ack !== undefined && object.ack !== null) {
      message.ack = object.ack as Long;
    } else {
      message.ack = Long.UZERO;
    }
    if (object.submitter !== undefined && object.submitter !== null) {
      message.submitter = object.submitter;
    } else {
      message.submitter = new Uint8Array();
    }
    return message;
  },
};

const baseMsgDeliverInboundResponse: object = {};

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
    const message = {
      ...baseMsgDeliverInboundResponse,
    } as MsgDeliverInboundResponse;
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
    const message = {
      ...baseMsgDeliverInboundResponse,
    } as MsgDeliverInboundResponse;
    return message;
  },

  toJSON(_: MsgDeliverInboundResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(
    _: DeepPartial<MsgDeliverInboundResponse>,
  ): MsgDeliverInboundResponse {
    const message = {
      ...baseMsgDeliverInboundResponse,
    } as MsgDeliverInboundResponse;
    return message;
  },
};

const baseMsgWalletAction: object = { action: '' };

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
    const message = { ...baseMsgWalletAction } as MsgWalletAction;
    message.owner = new Uint8Array();
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
    const message = { ...baseMsgWalletAction } as MsgWalletAction;
    message.owner = new Uint8Array();
    if (object.owner !== undefined && object.owner !== null) {
      message.owner = bytesFromBase64(object.owner);
    }
    if (object.action !== undefined && object.action !== null) {
      message.action = String(object.action);
    } else {
      message.action = '';
    }
    return message;
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

  fromPartial(object: DeepPartial<MsgWalletAction>): MsgWalletAction {
    const message = { ...baseMsgWalletAction } as MsgWalletAction;
    if (object.owner !== undefined && object.owner !== null) {
      message.owner = object.owner;
    } else {
      message.owner = new Uint8Array();
    }
    if (object.action !== undefined && object.action !== null) {
      message.action = object.action;
    } else {
      message.action = '';
    }
    return message;
  },
};

const baseMsgWalletActionResponse: object = {};

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
    const message = {
      ...baseMsgWalletActionResponse,
    } as MsgWalletActionResponse;
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
    const message = {
      ...baseMsgWalletActionResponse,
    } as MsgWalletActionResponse;
    return message;
  },

  toJSON(_: MsgWalletActionResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(
    _: DeepPartial<MsgWalletActionResponse>,
  ): MsgWalletActionResponse {
    const message = {
      ...baseMsgWalletActionResponse,
    } as MsgWalletActionResponse;
    return message;
  },
};

const baseMsgWalletSpendAction: object = { spendAction: '' };

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
    const message = { ...baseMsgWalletSpendAction } as MsgWalletSpendAction;
    message.owner = new Uint8Array();
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
    const message = { ...baseMsgWalletSpendAction } as MsgWalletSpendAction;
    message.owner = new Uint8Array();
    if (object.owner !== undefined && object.owner !== null) {
      message.owner = bytesFromBase64(object.owner);
    }
    if (object.spendAction !== undefined && object.spendAction !== null) {
      message.spendAction = String(object.spendAction);
    } else {
      message.spendAction = '';
    }
    return message;
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

  fromPartial(object: DeepPartial<MsgWalletSpendAction>): MsgWalletSpendAction {
    const message = { ...baseMsgWalletSpendAction } as MsgWalletSpendAction;
    if (object.owner !== undefined && object.owner !== null) {
      message.owner = object.owner;
    } else {
      message.owner = new Uint8Array();
    }
    if (object.spendAction !== undefined && object.spendAction !== null) {
      message.spendAction = object.spendAction;
    } else {
      message.spendAction = '';
    }
    return message;
  },
};

const baseMsgWalletSpendActionResponse: object = {};

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
    const message = {
      ...baseMsgWalletSpendActionResponse,
    } as MsgWalletSpendActionResponse;
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
    const message = {
      ...baseMsgWalletSpendActionResponse,
    } as MsgWalletSpendActionResponse;
    return message;
  },

  toJSON(_: MsgWalletSpendActionResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(
    _: DeepPartial<MsgWalletSpendActionResponse>,
  ): MsgWalletSpendActionResponse {
    const message = {
      ...baseMsgWalletSpendActionResponse,
    } as MsgWalletSpendActionResponse;
    return message;
  },
};

const baseMsgProvision: object = { nickname: '', powerFlags: '' };

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
    const message = { ...baseMsgProvision } as MsgProvision;
    message.powerFlags = [];
    message.address = new Uint8Array();
    message.submitter = new Uint8Array();
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
    const message = { ...baseMsgProvision } as MsgProvision;
    message.powerFlags = [];
    message.address = new Uint8Array();
    message.submitter = new Uint8Array();
    if (object.nickname !== undefined && object.nickname !== null) {
      message.nickname = String(object.nickname);
    } else {
      message.nickname = '';
    }
    if (object.address !== undefined && object.address !== null) {
      message.address = bytesFromBase64(object.address);
    }
    if (object.powerFlags !== undefined && object.powerFlags !== null) {
      for (const e of object.powerFlags) {
        message.powerFlags.push(String(e));
      }
    }
    if (object.submitter !== undefined && object.submitter !== null) {
      message.submitter = bytesFromBase64(object.submitter);
    }
    return message;
  },

  toJSON(message: MsgProvision): unknown {
    const obj: any = {};
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    if (message.powerFlags) {
      obj.powerFlags = message.powerFlags.map(e => e);
    } else {
      obj.powerFlags = [];
    }
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },

  fromPartial(object: DeepPartial<MsgProvision>): MsgProvision {
    const message = { ...baseMsgProvision } as MsgProvision;
    message.powerFlags = [];
    if (object.nickname !== undefined && object.nickname !== null) {
      message.nickname = object.nickname;
    } else {
      message.nickname = '';
    }
    if (object.address !== undefined && object.address !== null) {
      message.address = object.address;
    } else {
      message.address = new Uint8Array();
    }
    if (object.powerFlags !== undefined && object.powerFlags !== null) {
      for (const e of object.powerFlags) {
        message.powerFlags.push(e);
      }
    }
    if (object.submitter !== undefined && object.submitter !== null) {
      message.submitter = object.submitter;
    } else {
      message.submitter = new Uint8Array();
    }
    return message;
  },
};

const baseMsgProvisionResponse: object = {};

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
    const message = { ...baseMsgProvisionResponse } as MsgProvisionResponse;
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
    const message = { ...baseMsgProvisionResponse } as MsgProvisionResponse;
    return message;
  },

  toJSON(_: MsgProvisionResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(_: DeepPartial<MsgProvisionResponse>): MsgProvisionResponse {
    const message = { ...baseMsgProvisionResponse } as MsgProvisionResponse;
    return message;
  },
};

const baseMsgInstallBundle: object = { bundle: '' };

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
    const message = { ...baseMsgInstallBundle } as MsgInstallBundle;
    message.submitter = new Uint8Array();
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
    const message = { ...baseMsgInstallBundle } as MsgInstallBundle;
    message.submitter = new Uint8Array();
    if (object.bundle !== undefined && object.bundle !== null) {
      message.bundle = String(object.bundle);
    } else {
      message.bundle = '';
    }
    if (object.submitter !== undefined && object.submitter !== null) {
      message.submitter = bytesFromBase64(object.submitter);
    }
    return message;
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

  fromPartial(object: DeepPartial<MsgInstallBundle>): MsgInstallBundle {
    const message = { ...baseMsgInstallBundle } as MsgInstallBundle;
    if (object.bundle !== undefined && object.bundle !== null) {
      message.bundle = object.bundle;
    } else {
      message.bundle = '';
    }
    if (object.submitter !== undefined && object.submitter !== null) {
      message.submitter = object.submitter;
    } else {
      message.submitter = new Uint8Array();
    }
    return message;
  },
};

const baseMsgInstallBundleResponse: object = {};

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
    const message = {
      ...baseMsgInstallBundleResponse,
    } as MsgInstallBundleResponse;
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
    const message = {
      ...baseMsgInstallBundleResponse,
    } as MsgInstallBundleResponse;
    return message;
  },

  toJSON(_: MsgInstallBundleResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(
    _: DeepPartial<MsgInstallBundleResponse>,
  ): MsgInstallBundleResponse {
    const message = {
      ...baseMsgInstallBundleResponse,
    } as MsgInstallBundleResponse;
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
    return promise.then(data =>
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
    return promise.then(data =>
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
    return promise.then(data =>
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
    return promise.then(data =>
      MsgWalletSpendActionResponse.decode(new _m0.Reader(data)),
    );
  }

  Provision(request: MsgProvision): Promise<MsgProvisionResponse> {
    const data = MsgProvision.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Msg', 'Provision', data);
    return promise.then(data =>
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
var globalThis: any = (() => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  throw 'Unable to locate global object';
})();

const atob: (b64: string) => string =
  globalThis.atob ||
  (b64 => globalThis.Buffer.from(b64, 'base64').toString('binary'));
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
  (bin => globalThis.Buffer.from(bin, 'binary').toString('base64'));
function base64FromBytes(arr: Uint8Array): string {
  const bin: string[] = [];
  for (const byte of arr) {
    bin.push(String.fromCharCode(byte));
  }
  return btoa(bin.join(''));
}

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined
  | Long;
export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}
