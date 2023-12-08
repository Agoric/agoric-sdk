/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
import { Coin } from '../../cosmos/base/v1beta1/coin.js';
export const protobufPackage = 'agoric.swingset';
function createBaseCoreEvalProposal() {
  return { title: '', description: '', evals: [] };
}
export const CoreEvalProposal = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.title !== '') {
      writer.uint32(10).string(message.title);
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description);
    }
    for (const v of message.evals) {
      CoreEval.encode(v, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      evals: Array.isArray(object?.evals)
        ? object.evals.map(e => CoreEval.fromJSON(e))
        : [],
    };
  },
  toJSON(message) {
    const obj = {};
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined &&
      (obj.description = message.description);
    if (message.evals) {
      obj.evals = message.evals.map(e => (e ? CoreEval.toJSON(e) : undefined));
    } else {
      obj.evals = [];
    }
    return obj;
  },
  fromPartial(object) {
    const message = createBaseCoreEvalProposal();
    message.title = object.title ?? '';
    message.description = object.description ?? '';
    message.evals = object.evals?.map(e => CoreEval.fromPartial(e)) || [];
    return message;
  },
};
function createBaseCoreEval() {
  return { json_permits: '', js_code: '' };
}
export const CoreEval = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.json_permits !== '') {
      writer.uint32(10).string(message.json_permits);
    }
    if (message.js_code !== '') {
      writer.uint32(18).string(message.js_code);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoreEval();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.json_permits = reader.string();
          break;
        case 2:
          message.js_code = reader.string();
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
      json_permits: isSet(object.json_permits)
        ? String(object.json_permits)
        : '',
      js_code: isSet(object.js_code) ? String(object.js_code) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.json_permits !== undefined &&
      (obj.json_permits = message.json_permits);
    message.js_code !== undefined && (obj.js_code = message.js_code);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseCoreEval();
    message.json_permits = object.json_permits ?? '';
    message.js_code = object.js_code ?? '';
    return message;
  },
};
function createBaseParams() {
  return {
    beans_per_unit: [],
    fee_unit_price: [],
    bootstrap_vat_config: '',
    power_flag_fees: [],
    queue_max: [],
  };
}
export const Params = {
  encode(message, writer = _m0.Writer.create()) {
    for (const v of message.beans_per_unit) {
      StringBeans.encode(v, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.fee_unit_price) {
      Coin.encode(v, writer.uint32(18).fork()).ldelim();
    }
    if (message.bootstrap_vat_config !== '') {
      writer.uint32(26).string(message.bootstrap_vat_config);
    }
    for (const v of message.power_flag_fees) {
      PowerFlagFee.encode(v, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.queue_max) {
      QueueSize.encode(v, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.beans_per_unit.push(
            StringBeans.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.fee_unit_price.push(Coin.decode(reader, reader.uint32()));
          break;
        case 3:
          message.bootstrap_vat_config = reader.string();
          break;
        case 4:
          message.power_flag_fees.push(
            PowerFlagFee.decode(reader, reader.uint32()),
          );
          break;
        case 5:
          message.queue_max.push(QueueSize.decode(reader, reader.uint32()));
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
      beans_per_unit: Array.isArray(object?.beans_per_unit)
        ? object.beans_per_unit.map(e => StringBeans.fromJSON(e))
        : [],
      fee_unit_price: Array.isArray(object?.fee_unit_price)
        ? object.fee_unit_price.map(e => Coin.fromJSON(e))
        : [],
      bootstrap_vat_config: isSet(object.bootstrap_vat_config)
        ? String(object.bootstrap_vat_config)
        : '',
      power_flag_fees: Array.isArray(object?.power_flag_fees)
        ? object.power_flag_fees.map(e => PowerFlagFee.fromJSON(e))
        : [],
      queue_max: Array.isArray(object?.queue_max)
        ? object.queue_max.map(e => QueueSize.fromJSON(e))
        : [],
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.beans_per_unit) {
      obj.beans_per_unit = message.beans_per_unit.map(e =>
        e ? StringBeans.toJSON(e) : undefined,
      );
    } else {
      obj.beans_per_unit = [];
    }
    if (message.fee_unit_price) {
      obj.fee_unit_price = message.fee_unit_price.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.fee_unit_price = [];
    }
    message.bootstrap_vat_config !== undefined &&
      (obj.bootstrap_vat_config = message.bootstrap_vat_config);
    if (message.power_flag_fees) {
      obj.power_flag_fees = message.power_flag_fees.map(e =>
        e ? PowerFlagFee.toJSON(e) : undefined,
      );
    } else {
      obj.power_flag_fees = [];
    }
    if (message.queue_max) {
      obj.queue_max = message.queue_max.map(e =>
        e ? QueueSize.toJSON(e) : undefined,
      );
    } else {
      obj.queue_max = [];
    }
    return obj;
  },
  fromPartial(object) {
    const message = createBaseParams();
    message.beans_per_unit =
      object.beans_per_unit?.map(e => StringBeans.fromPartial(e)) || [];
    message.fee_unit_price =
      object.fee_unit_price?.map(e => Coin.fromPartial(e)) || [];
    message.bootstrap_vat_config = object.bootstrap_vat_config ?? '';
    message.power_flag_fees =
      object.power_flag_fees?.map(e => PowerFlagFee.fromPartial(e)) || [];
    message.queue_max =
      object.queue_max?.map(e => QueueSize.fromPartial(e)) || [];
    return message;
  },
};
function createBaseState() {
  return { queue_allowed: [] };
}
export const State = {
  encode(message, writer = _m0.Writer.create()) {
    for (const v of message.queue_allowed) {
      QueueSize.encode(v, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.queue_allowed.push(QueueSize.decode(reader, reader.uint32()));
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
      queue_allowed: Array.isArray(object?.queue_allowed)
        ? object.queue_allowed.map(e => QueueSize.fromJSON(e))
        : [],
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.queue_allowed) {
      obj.queue_allowed = message.queue_allowed.map(e =>
        e ? QueueSize.toJSON(e) : undefined,
      );
    } else {
      obj.queue_allowed = [];
    }
    return obj;
  },
  fromPartial(object) {
    const message = createBaseState();
    message.queue_allowed =
      object.queue_allowed?.map(e => QueueSize.fromPartial(e)) || [];
    return message;
  },
};
function createBaseStringBeans() {
  return { key: '', beans: '' };
}
export const StringBeans = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.beans !== '') {
      writer.uint32(18).string(message.beans);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      beans: isSet(object.beans) ? String(object.beans) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.key !== undefined && (obj.key = message.key);
    message.beans !== undefined && (obj.beans = message.beans);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseStringBeans();
    message.key = object.key ?? '';
    message.beans = object.beans ?? '';
    return message;
  },
};
function createBasePowerFlagFee() {
  return { power_flag: '', fee: [] };
}
export const PowerFlagFee = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.power_flag !== '') {
      writer.uint32(10).string(message.power_flag);
    }
    for (const v of message.fee) {
      Coin.encode(v, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePowerFlagFee();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.power_flag = reader.string();
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
  fromJSON(object) {
    return {
      power_flag: isSet(object.power_flag) ? String(object.power_flag) : '',
      fee: Array.isArray(object?.fee)
        ? object.fee.map(e => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message) {
    const obj = {};
    message.power_flag !== undefined && (obj.power_flag = message.power_flag);
    if (message.fee) {
      obj.fee = message.fee.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.fee = [];
    }
    return obj;
  },
  fromPartial(object) {
    const message = createBasePowerFlagFee();
    message.power_flag = object.power_flag ?? '';
    message.fee = object.fee?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
};
function createBaseQueueSize() {
  return { key: '', size: 0 };
}
export const QueueSize = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.size !== 0) {
      writer.uint32(16).int32(message.size);
    }
    return writer;
  },
  decode(input, length) {
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
  fromJSON(object) {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      size: isSet(object.size) ? Number(object.size) : 0,
    };
  },
  toJSON(message) {
    const obj = {};
    message.key !== undefined && (obj.key = message.key);
    message.size !== undefined && (obj.size = Math.round(message.size));
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueueSize();
    message.key = object.key ?? '';
    message.size = object.size ?? 0;
    return message;
  },
};
function createBaseEgress() {
  return { nickname: '', peer: new Uint8Array(), power_flags: [] };
}
export const Egress = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.nickname !== '') {
      writer.uint32(10).string(message.nickname);
    }
    if (message.peer.length !== 0) {
      writer.uint32(18).bytes(message.peer);
    }
    for (const v of message.power_flags) {
      writer.uint32(26).string(v);
    }
    return writer;
  },
  decode(input, length) {
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
          message.power_flags.push(reader.string());
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
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
      power_flags: Array.isArray(object?.power_flags)
        ? object.power_flags.map(e => String(e))
        : [],
    };
  },
  toJSON(message) {
    const obj = {};
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    if (message.power_flags) {
      obj.power_flags = message.power_flags.map(e => e);
    } else {
      obj.power_flags = [];
    }
    return obj;
  },
  fromPartial(object) {
    const message = createBaseEgress();
    message.nickname = object.nickname ?? '';
    message.peer = object.peer ?? new Uint8Array();
    message.power_flags = object.power_flags?.map(e => e) || [];
    return message;
  },
};
function createBaseSwingStoreArtifact() {
  return { name: '', data: new Uint8Array() };
}
export const SwingStoreArtifact = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwingStoreArtifact();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.data = reader.bytes();
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
      name: isSet(object.name) ? String(object.name) : '',
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
    message.name !== undefined && (obj.name = message.name);
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object) {
    const message = createBaseSwingStoreArtifact();
    message.name = object.name ?? '';
    message.data = object.data ?? new Uint8Array();
    return message;
  },
};
var globalThis = (() => {
  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  throw 'Unable to locate global object';
})();
function bytesFromBase64(b64) {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, 'base64'));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}
function base64FromBytes(arr) {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString('base64');
  } else {
    const bin = [];
    arr.forEach(byte => {
      bin.push(String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(''));
  }
}
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long;
  _m0.configure();
}
function isSet(value) {
  return value !== null && value !== undefined;
}
