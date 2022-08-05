/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
export const protobufPackage = 'agoric.swingset';
function createBaseMsgDeliverInbound() {
  return {
    messages: [],
    nums: [],
    ack: Long.UZERO,
    submitter: new Uint8Array(),
  };
}
export const MsgDeliverInbound = {
  encode(message, writer = _m0.Writer.create()) {
    for (const v of message.messages) {
      writer.uint32(10).string(v);
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
  decode(input, length) {
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
              message.nums.push(reader.uint64());
            }
          } else {
            message.nums.push(reader.uint64());
          }
          break;
        case 3:
          message.ack = reader.uint64();
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
  fromJSON(object) {
    return {
      messages: Array.isArray(object?.messages)
        ? object.messages.map((e) => String(e))
        : [],
      nums: Array.isArray(object?.nums)
        ? object.nums.map((e) => Long.fromValue(e))
        : [],
      ack: isSet(object.ack) ? Long.fromValue(object.ack) : Long.UZERO,
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
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
  fromPartial(object) {
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
function createBaseMsgDeliverInboundResponse() {
  return {};
}
export const MsgDeliverInboundResponse = {
  encode(_, writer = _m0.Writer.create()) {
    return writer;
  },
  decode(input, length) {
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
  fromJSON(_) {
    return {};
  },
  toJSON(_) {
    const obj = {};
    return obj;
  },
  fromPartial(_) {
    const message = createBaseMsgDeliverInboundResponse();
    return message;
  },
};
function createBaseMsgWalletAction() {
  return { owner: new Uint8Array(), action: '' };
}
export const MsgWalletAction = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.owner.length !== 0) {
      writer.uint32(10).bytes(message.owner);
    }
    if (message.action !== '') {
      writer.uint32(18).string(message.action);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      owner: isSet(object.owner)
        ? bytesFromBase64(object.owner)
        : new Uint8Array(),
      action: isSet(object.action) ? String(object.action) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.owner !== undefined &&
      (obj.owner = base64FromBytes(
        message.owner !== undefined ? message.owner : new Uint8Array(),
      ));
    message.action !== undefined && (obj.action = message.action);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseMsgWalletAction();
    message.owner = object.owner ?? new Uint8Array();
    message.action = object.action ?? '';
    return message;
  },
};
function createBaseMsgWalletActionResponse() {
  return {};
}
export const MsgWalletActionResponse = {
  encode(_, writer = _m0.Writer.create()) {
    return writer;
  },
  decode(input, length) {
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
  fromJSON(_) {
    return {};
  },
  toJSON(_) {
    const obj = {};
    return obj;
  },
  fromPartial(_) {
    const message = createBaseMsgWalletActionResponse();
    return message;
  },
};
function createBaseMsgWalletSpendAction() {
  return { owner: new Uint8Array(), spendAction: '' };
}
export const MsgWalletSpendAction = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.owner.length !== 0) {
      writer.uint32(10).bytes(message.owner);
    }
    if (message.spendAction !== '') {
      writer.uint32(18).string(message.spendAction);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      owner: isSet(object.owner)
        ? bytesFromBase64(object.owner)
        : new Uint8Array(),
      spendAction: isSet(object.spendAction) ? String(object.spendAction) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.owner !== undefined &&
      (obj.owner = base64FromBytes(
        message.owner !== undefined ? message.owner : new Uint8Array(),
      ));
    message.spendAction !== undefined &&
      (obj.spendAction = message.spendAction);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseMsgWalletSpendAction();
    message.owner = object.owner ?? new Uint8Array();
    message.spendAction = object.spendAction ?? '';
    return message;
  },
};
function createBaseMsgWalletSpendActionResponse() {
  return {};
}
export const MsgWalletSpendActionResponse = {
  encode(_, writer = _m0.Writer.create()) {
    return writer;
  },
  decode(input, length) {
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
  fromJSON(_) {
    return {};
  },
  toJSON(_) {
    const obj = {};
    return obj;
  },
  fromPartial(_) {
    const message = createBaseMsgWalletSpendActionResponse();
    return message;
  },
};
function createBaseMsgProvision() {
  return {
    nickname: '',
    address: new Uint8Array(),
    powerFlags: [],
    submitter: new Uint8Array(),
  };
}
export const MsgProvision = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.nickname !== '') {
      writer.uint32(10).string(message.nickname);
    }
    if (message.address.length !== 0) {
      writer.uint32(18).bytes(message.address);
    }
    for (const v of message.powerFlags) {
      writer.uint32(26).string(v);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(34).bytes(message.submitter);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      nickname: isSet(object.nickname) ? String(object.nickname) : '',
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
      powerFlags: Array.isArray(object?.powerFlags)
        ? object.powerFlags.map((e) => String(e))
        : [],
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
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
  fromPartial(object) {
    const message = createBaseMsgProvision();
    message.nickname = object.nickname ?? '';
    message.address = object.address ?? new Uint8Array();
    message.powerFlags = object.powerFlags?.map((e) => e) || [];
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
};
function createBaseMsgProvisionResponse() {
  return {};
}
export const MsgProvisionResponse = {
  encode(_, writer = _m0.Writer.create()) {
    return writer;
  },
  decode(input, length) {
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
  fromJSON(_) {
    return {};
  },
  toJSON(_) {
    const obj = {};
    return obj;
  },
  fromPartial(_) {
    const message = createBaseMsgProvisionResponse();
    return message;
  },
};
function createBaseMsgInstallBundle() {
  return { bundle: '', submitter: new Uint8Array() };
}
export const MsgInstallBundle = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.bundle !== '') {
      writer.uint32(10).string(message.bundle);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(18).bytes(message.submitter);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      bundle: isSet(object.bundle) ? String(object.bundle) : '',
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
    message.bundle !== undefined && (obj.bundle = message.bundle);
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object) {
    const message = createBaseMsgInstallBundle();
    message.bundle = object.bundle ?? '';
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
};
function createBaseMsgInstallBundleResponse() {
  return {};
}
export const MsgInstallBundleResponse = {
  encode(_, writer = _m0.Writer.create()) {
    return writer;
  },
  decode(input, length) {
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
  fromJSON(_) {
    return {};
  },
  toJSON(_) {
    const obj = {};
    return obj;
  },
  fromPartial(_) {
    const message = createBaseMsgInstallBundleResponse();
    return message;
  },
};
export class MsgClientImpl {
  rpc;
  constructor(rpc) {
    this.rpc = rpc;
    this.InstallBundle = this.InstallBundle.bind(this);
    this.DeliverInbound = this.DeliverInbound.bind(this);
    this.WalletAction = this.WalletAction.bind(this);
    this.WalletSpendAction = this.WalletSpendAction.bind(this);
    this.Provision = this.Provision.bind(this);
  }
  InstallBundle(request) {
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
  DeliverInbound(request) {
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
  WalletAction(request) {
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
  WalletSpendAction(request) {
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
  Provision(request) {
    const data = MsgProvision.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Msg', 'Provision', data);
    return promise.then((data) =>
      MsgProvisionResponse.decode(new _m0.Reader(data)),
    );
  }
}
var globalThis = (() => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  throw 'Unable to locate global object';
})();
const atob =
  globalThis.atob ||
  ((b64) => globalThis.Buffer.from(b64, 'base64').toString('binary'));
function bytesFromBase64(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}
const btoa =
  globalThis.btoa ||
  ((bin) => globalThis.Buffer.from(bin, 'binary').toString('base64'));
function base64FromBytes(arr) {
  const bin = [];
  arr.forEach((byte) => {
    bin.push(String.fromCharCode(byte));
  });
  return btoa(bin.join(''));
}
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long;
  _m0.configure();
}
function isSet(value) {
  return value !== null && value !== undefined;
}
