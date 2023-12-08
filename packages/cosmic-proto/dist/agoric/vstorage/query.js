/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
import {
  PageRequest,
  PageResponse,
} from '../../cosmos/base/query/v1beta1/pagination.js';
export const protobufPackage = 'agoric.vstorage';
function createBaseQueryDataRequest() {
  return { path: '' };
}
export const QueryDataRequest = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.path !== '') {
      writer.uint32(10).string(message.path);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDataRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.path = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object) {
    return { path: isSet(object.path) ? String(object.path) : '' };
  },
  toJSON(message) {
    const obj = {};
    message.path !== undefined && (obj.path = message.path);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryDataRequest();
    message.path = object.path ?? '';
    return message;
  },
};
function createBaseQueryDataResponse() {
  return { value: '' };
}
export const QueryDataResponse = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.value !== '') {
      writer.uint32(10).string(message.value);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDataResponse();
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
    return { value: isSet(object.value) ? String(object.value) : '' };
  },
  toJSON(message) {
    const obj = {};
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryDataResponse();
    message.value = object.value ?? '';
    return message;
  },
};
function createBaseQueryCapDataRequest() {
  return {
    path: '',
    media_type: '',
    item_format: '',
    remotable_value_format: '',
  };
}
export const QueryCapDataRequest = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.path !== '') {
      writer.uint32(10).string(message.path);
    }
    if (message.media_type !== '') {
      writer.uint32(18).string(message.media_type);
    }
    if (message.item_format !== '') {
      writer.uint32(26).string(message.item_format);
    }
    if (message.remotable_value_format !== '') {
      writer.uint32(82).string(message.remotable_value_format);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCapDataRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.path = reader.string();
          break;
        case 2:
          message.media_type = reader.string();
          break;
        case 3:
          message.item_format = reader.string();
          break;
        case 10:
          message.remotable_value_format = reader.string();
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
      path: isSet(object.path) ? String(object.path) : '',
      media_type: isSet(object.media_type) ? String(object.media_type) : '',
      item_format: isSet(object.item_format) ? String(object.item_format) : '',
      remotable_value_format: isSet(object.remotable_value_format)
        ? String(object.remotable_value_format)
        : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.path !== undefined && (obj.path = message.path);
    message.media_type !== undefined && (obj.media_type = message.media_type);
    message.item_format !== undefined &&
      (obj.item_format = message.item_format);
    message.remotable_value_format !== undefined &&
      (obj.remotable_value_format = message.remotable_value_format);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryCapDataRequest();
    message.path = object.path ?? '';
    message.media_type = object.media_type ?? '';
    message.item_format = object.item_format ?? '';
    message.remotable_value_format = object.remotable_value_format ?? '';
    return message;
  },
};
function createBaseQueryCapDataResponse() {
  return { block_height: '', value: '' };
}
export const QueryCapDataResponse = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.block_height !== '') {
      writer.uint32(10).string(message.block_height);
    }
    if (message.value !== '') {
      writer.uint32(82).string(message.value);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCapDataResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.block_height = reader.string();
          break;
        case 10:
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
      block_height: isSet(object.block_height)
        ? String(object.block_height)
        : '',
      value: isSet(object.value) ? String(object.value) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.block_height !== undefined &&
      (obj.block_height = message.block_height);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryCapDataResponse();
    message.block_height = object.block_height ?? '';
    message.value = object.value ?? '';
    return message;
  },
};
function createBaseQueryChildrenRequest() {
  return { path: '', pagination: undefined };
}
export const QueryChildrenRequest = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.path !== '') {
      writer.uint32(10).string(message.path);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryChildrenRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.path = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
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
      path: isSet(object.path) ? String(object.path) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message) {
    const obj = {};
    message.path !== undefined && (obj.path = message.path);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryChildrenRequest();
    message.path = object.path ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
};
function createBaseQueryChildrenResponse() {
  return { children: [], pagination: undefined };
}
export const QueryChildrenResponse = {
  encode(message, writer = _m0.Writer.create()) {
    for (const v of message.children) {
      writer.uint32(10).string(v);
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryChildrenResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.children.push(reader.string());
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
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
      children: Array.isArray(object?.children)
        ? object.children.map(e => String(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.children) {
      obj.children = message.children.map(e => e);
    } else {
      obj.children = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object) {
    const message = createBaseQueryChildrenResponse();
    message.children = object.children?.map(e => e) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
};
export class QueryClientImpl {
  rpc;
  service;
  constructor(rpc, opts) {
    this.service = opts?.service || 'agoric.vstorage.Query';
    this.rpc = rpc;
    this.Data = this.Data.bind(this);
    this.CapData = this.CapData.bind(this);
    this.Children = this.Children.bind(this);
  }
  Data(request) {
    const data = QueryDataRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, 'Data', data);
    return promise.then(data => QueryDataResponse.decode(new _m0.Reader(data)));
  }
  CapData(request) {
    const data = QueryCapDataRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, 'CapData', data);
    return promise.then(data =>
      QueryCapDataResponse.decode(new _m0.Reader(data)),
    );
  }
  Children(request) {
    const data = QueryChildrenRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, 'Children', data);
    return promise.then(data =>
      QueryChildrenResponse.decode(new _m0.Reader(data)),
    );
  }
}
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long;
  _m0.configure();
}
function isSet(value) {
  return value !== null && value !== undefined;
}
