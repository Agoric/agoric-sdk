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
        ? object.children.map((e) => String(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.children) {
      obj.children = message.children.map((e) => e);
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
    message.children = object.children?.map((e) => e) || [];
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
    this.Children = this.Children.bind(this);
  }
  Data(request) {
    const data = QueryDataRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, 'Data', data);
    return promise.then((data) =>
      QueryDataResponse.decode(new _m0.Reader(data)),
    );
  }
  Children(request) {
    const data = QueryChildrenRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, 'Children', data);
    return promise.then((data) =>
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
