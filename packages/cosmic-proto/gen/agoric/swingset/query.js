/* eslint-disable */
import { Params, Egress } from './swingset.js';
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
export const protobufPackage = 'agoric.swingset';
function createBaseQueryParamsRequest() {
  return {};
}
export const QueryParamsRequest = {
  encode(_, writer = _m0.Writer.create()) {
    return writer;
  },
  decode(input, length) {
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
  fromJSON(_) {
    return {};
  },
  toJSON(_) {
    const obj = {};
    return obj;
  },
  fromPartial(_) {
    const message = createBaseQueryParamsRequest();
    return message;
  },
};
function createBaseQueryParamsResponse() {
  return { params: undefined };
}
export const QueryParamsResponse = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message) {
    const obj = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
};
function createBaseQueryEgressRequest() {
  return { peer: new Uint8Array() };
}
export const QueryEgressRequest = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.peer.length !== 0) {
      writer.uint32(10).bytes(message.peer);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryEgressRequest();
    message.peer = object.peer ?? new Uint8Array();
    return message;
  },
};
function createBaseQueryEgressResponse() {
  return { egress: undefined };
}
export const QueryEgressResponse = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.egress !== undefined) {
      Egress.encode(message.egress, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      egress: isSet(object.egress) ? Egress.fromJSON(object.egress) : undefined,
    };
  },
  toJSON(message) {
    const obj = {};
    message.egress !== undefined &&
      (obj.egress = message.egress ? Egress.toJSON(message.egress) : undefined);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryEgressResponse();
    message.egress =
      object.egress !== undefined && object.egress !== null
        ? Egress.fromPartial(object.egress)
        : undefined;
    return message;
  },
};
function createBaseQueryMailboxRequest() {
  return { peer: new Uint8Array() };
}
export const QueryMailboxRequest = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.peer.length !== 0) {
      writer.uint32(10).bytes(message.peer);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryMailboxRequest();
    message.peer = object.peer ?? new Uint8Array();
    return message;
  },
};
function createBaseQueryMailboxResponse() {
  return { value: '' };
}
export const QueryMailboxResponse = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.value !== '') {
      writer.uint32(10).string(message.value);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      value: isSet(object.value) ? String(object.value) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryMailboxResponse();
    message.value = object.value ?? '';
    return message;
  },
};
export class QueryClientImpl {
  rpc;
  constructor(rpc) {
    this.rpc = rpc;
    this.Params = this.Params.bind(this);
    this.Egress = this.Egress.bind(this);
    this.Mailbox = this.Mailbox.bind(this);
  }
  Params(request) {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Query', 'Params', data);
    return promise.then((data) =>
      QueryParamsResponse.decode(new _m0.Reader(data)),
    );
  }
  Egress(request) {
    const data = QueryEgressRequest.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Query', 'Egress', data);
    return promise.then((data) =>
      QueryEgressResponse.decode(new _m0.Reader(data)),
    );
  }
  Mailbox(request) {
    const data = QueryMailboxRequest.encode(request).finish();
    const promise = this.rpc.request('agoric.swingset.Query', 'Mailbox', data);
    return promise.then((data) =>
      QueryMailboxResponse.decode(new _m0.Reader(data)),
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
