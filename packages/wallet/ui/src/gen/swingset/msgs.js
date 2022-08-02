/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
export const protobufPackage = 'agoric.swingset';
const baseMsgDeliverInbound = {
    messages: '',
    nums: Long.UZERO,
    ack: Long.UZERO,
};
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
        const message = { ...baseMsgDeliverInbound };
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
                            message.nums.push(reader.uint64());
                        }
                    }
                    else {
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
        const message = { ...baseMsgDeliverInbound };
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
        }
        else {
            message.ack = Long.UZERO;
        }
        if (object.submitter !== undefined && object.submitter !== null) {
            message.submitter = bytesFromBase64(object.submitter);
        }
        return message;
    },
    toJSON(message) {
        const obj = {};
        if (message.messages) {
            obj.messages = message.messages.map(e => e);
        }
        else {
            obj.messages = [];
        }
        if (message.nums) {
            obj.nums = message.nums.map(e => (e || Long.UZERO).toString());
        }
        else {
            obj.nums = [];
        }
        message.ack !== undefined &&
            (obj.ack = (message.ack || Long.UZERO).toString());
        message.submitter !== undefined &&
            (obj.submitter = base64FromBytes(message.submitter !== undefined ? message.submitter : new Uint8Array()));
        return obj;
    },
    fromPartial(object) {
        const message = { ...baseMsgDeliverInbound };
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
            message.ack = object.ack;
        }
        else {
            message.ack = Long.UZERO;
        }
        if (object.submitter !== undefined && object.submitter !== null) {
            message.submitter = object.submitter;
        }
        else {
            message.submitter = new Uint8Array();
        }
        return message;
    },
};
const baseMsgDeliverInboundResponse = {};
export const MsgDeliverInboundResponse = {
    encode(_, writer = _m0.Writer.create()) {
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = {
            ...baseMsgDeliverInboundResponse,
        };
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
        const message = {
            ...baseMsgDeliverInboundResponse,
        };
        return message;
    },
    toJSON(_) {
        const obj = {};
        return obj;
    },
    fromPartial(_) {
        const message = {
            ...baseMsgDeliverInboundResponse,
        };
        return message;
    },
};
const baseMsgWalletAction = { action: '' };
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
        const message = { ...baseMsgWalletAction };
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
    fromJSON(object) {
        const message = { ...baseMsgWalletAction };
        message.owner = new Uint8Array();
        if (object.owner !== undefined && object.owner !== null) {
            message.owner = bytesFromBase64(object.owner);
        }
        if (object.action !== undefined && object.action !== null) {
            message.action = String(object.action);
        }
        else {
            message.action = '';
        }
        return message;
    },
    toJSON(message) {
        const obj = {};
        message.owner !== undefined &&
            (obj.owner = base64FromBytes(message.owner !== undefined ? message.owner : new Uint8Array()));
        message.action !== undefined && (obj.action = message.action);
        return obj;
    },
    fromPartial(object) {
        const message = { ...baseMsgWalletAction };
        if (object.owner !== undefined && object.owner !== null) {
            message.owner = object.owner;
        }
        else {
            message.owner = new Uint8Array();
        }
        if (object.action !== undefined && object.action !== null) {
            message.action = object.action;
        }
        else {
            message.action = '';
        }
        return message;
    },
};
const baseMsgWalletActionResponse = {};
export const MsgWalletActionResponse = {
    encode(_, writer = _m0.Writer.create()) {
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = {
            ...baseMsgWalletActionResponse,
        };
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
        const message = {
            ...baseMsgWalletActionResponse,
        };
        return message;
    },
    toJSON(_) {
        const obj = {};
        return obj;
    },
    fromPartial(_) {
        const message = {
            ...baseMsgWalletActionResponse,
        };
        return message;
    },
};
const baseMsgWalletSpendAction = { spendAction: '' };
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
        const message = { ...baseMsgWalletSpendAction };
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
    fromJSON(object) {
        const message = { ...baseMsgWalletSpendAction };
        message.owner = new Uint8Array();
        if (object.owner !== undefined && object.owner !== null) {
            message.owner = bytesFromBase64(object.owner);
        }
        if (object.spendAction !== undefined && object.spendAction !== null) {
            message.spendAction = String(object.spendAction);
        }
        else {
            message.spendAction = '';
        }
        return message;
    },
    toJSON(message) {
        const obj = {};
        message.owner !== undefined &&
            (obj.owner = base64FromBytes(message.owner !== undefined ? message.owner : new Uint8Array()));
        message.spendAction !== undefined &&
            (obj.spendAction = message.spendAction);
        return obj;
    },
    fromPartial(object) {
        const message = { ...baseMsgWalletSpendAction };
        if (object.owner !== undefined && object.owner !== null) {
            message.owner = object.owner;
        }
        else {
            message.owner = new Uint8Array();
        }
        if (object.spendAction !== undefined && object.spendAction !== null) {
            message.spendAction = object.spendAction;
        }
        else {
            message.spendAction = '';
        }
        return message;
    },
};
const baseMsgWalletSpendActionResponse = {};
export const MsgWalletSpendActionResponse = {
    encode(_, writer = _m0.Writer.create()) {
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = {
            ...baseMsgWalletSpendActionResponse,
        };
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
        const message = {
            ...baseMsgWalletSpendActionResponse,
        };
        return message;
    },
    toJSON(_) {
        const obj = {};
        return obj;
    },
    fromPartial(_) {
        const message = {
            ...baseMsgWalletSpendActionResponse,
        };
        return message;
    },
};
const baseMsgProvision = { nickname: '', powerFlags: '' };
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
        const message = { ...baseMsgProvision };
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
    fromJSON(object) {
        const message = { ...baseMsgProvision };
        message.powerFlags = [];
        message.address = new Uint8Array();
        message.submitter = new Uint8Array();
        if (object.nickname !== undefined && object.nickname !== null) {
            message.nickname = String(object.nickname);
        }
        else {
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
    toJSON(message) {
        const obj = {};
        message.nickname !== undefined && (obj.nickname = message.nickname);
        message.address !== undefined &&
            (obj.address = base64FromBytes(message.address !== undefined ? message.address : new Uint8Array()));
        if (message.powerFlags) {
            obj.powerFlags = message.powerFlags.map(e => e);
        }
        else {
            obj.powerFlags = [];
        }
        message.submitter !== undefined &&
            (obj.submitter = base64FromBytes(message.submitter !== undefined ? message.submitter : new Uint8Array()));
        return obj;
    },
    fromPartial(object) {
        const message = { ...baseMsgProvision };
        message.powerFlags = [];
        if (object.nickname !== undefined && object.nickname !== null) {
            message.nickname = object.nickname;
        }
        else {
            message.nickname = '';
        }
        if (object.address !== undefined && object.address !== null) {
            message.address = object.address;
        }
        else {
            message.address = new Uint8Array();
        }
        if (object.powerFlags !== undefined && object.powerFlags !== null) {
            for (const e of object.powerFlags) {
                message.powerFlags.push(e);
            }
        }
        if (object.submitter !== undefined && object.submitter !== null) {
            message.submitter = object.submitter;
        }
        else {
            message.submitter = new Uint8Array();
        }
        return message;
    },
};
const baseMsgProvisionResponse = {};
export const MsgProvisionResponse = {
    encode(_, writer = _m0.Writer.create()) {
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = { ...baseMsgProvisionResponse };
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
        const message = { ...baseMsgProvisionResponse };
        return message;
    },
    toJSON(_) {
        const obj = {};
        return obj;
    },
    fromPartial(_) {
        const message = { ...baseMsgProvisionResponse };
        return message;
    },
};
const baseMsgInstallBundle = { bundle: '' };
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
        const message = { ...baseMsgInstallBundle };
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
    fromJSON(object) {
        const message = { ...baseMsgInstallBundle };
        message.submitter = new Uint8Array();
        if (object.bundle !== undefined && object.bundle !== null) {
            message.bundle = String(object.bundle);
        }
        else {
            message.bundle = '';
        }
        if (object.submitter !== undefined && object.submitter !== null) {
            message.submitter = bytesFromBase64(object.submitter);
        }
        return message;
    },
    toJSON(message) {
        const obj = {};
        message.bundle !== undefined && (obj.bundle = message.bundle);
        message.submitter !== undefined &&
            (obj.submitter = base64FromBytes(message.submitter !== undefined ? message.submitter : new Uint8Array()));
        return obj;
    },
    fromPartial(object) {
        const message = { ...baseMsgInstallBundle };
        if (object.bundle !== undefined && object.bundle !== null) {
            message.bundle = object.bundle;
        }
        else {
            message.bundle = '';
        }
        if (object.submitter !== undefined && object.submitter !== null) {
            message.submitter = object.submitter;
        }
        else {
            message.submitter = new Uint8Array();
        }
        return message;
    },
};
const baseMsgInstallBundleResponse = {};
export const MsgInstallBundleResponse = {
    encode(_, writer = _m0.Writer.create()) {
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = {
            ...baseMsgInstallBundleResponse,
        };
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
        const message = {
            ...baseMsgInstallBundleResponse,
        };
        return message;
    },
    toJSON(_) {
        const obj = {};
        return obj;
    },
    fromPartial(_) {
        const message = {
            ...baseMsgInstallBundleResponse,
        };
        return message;
    },
};
export class MsgClientImpl {
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
        const promise = this.rpc.request('agoric.swingset.Msg', 'InstallBundle', data);
        return promise.then(data => MsgInstallBundleResponse.decode(new _m0.Reader(data)));
    }
    DeliverInbound(request) {
        const data = MsgDeliverInbound.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'DeliverInbound', data);
        return promise.then(data => MsgDeliverInboundResponse.decode(new _m0.Reader(data)));
    }
    WalletAction(request) {
        const data = MsgWalletAction.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'WalletAction', data);
        return promise.then(data => MsgWalletActionResponse.decode(new _m0.Reader(data)));
    }
    WalletSpendAction(request) {
        const data = MsgWalletSpendAction.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'WalletSpendAction', data);
        return promise.then(data => MsgWalletSpendActionResponse.decode(new _m0.Reader(data)));
    }
    Provision(request) {
        const data = MsgProvision.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'Provision', data);
        return promise.then(data => MsgProvisionResponse.decode(new _m0.Reader(data)));
    }
}
var globalThis = (() => {
    if (typeof globalThis !== 'undefined')
        return globalThis;
    if (typeof self !== 'undefined')
        return self;
    if (typeof window !== 'undefined')
        return window;
    if (typeof global !== 'undefined')
        return global;
    throw 'Unable to locate global object';
})();
const atob = globalThis.atob ||
    (b64 => globalThis.Buffer.from(b64, 'base64').toString('binary'));
function bytesFromBase64(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
        arr[i] = bin.charCodeAt(i);
    }
    return arr;
}
const btoa = globalThis.btoa ||
    (bin => globalThis.Buffer.from(bin, 'binary').toString('base64'));
function base64FromBytes(arr) {
    const bin = [];
    for (const byte of arr) {
        bin.push(String.fromCharCode(byte));
    }
    return btoa(bin.join(''));
}
if (_m0.util.Long !== Long) {
    _m0.util.Long = Long;
    _m0.configure();
}
