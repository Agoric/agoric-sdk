//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../base/query/v1beta1/pagination.js';
import { Grant, type GrantSDKType } from './feegrant.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** QueryAllowanceRequest is the request type for the Query/Allowance RPC method. */
export interface QueryAllowanceRequest {
  /** granter is the address of the user granting an allowance of their funds. */
  granter: string;
  /** grantee is the address of the user being granted an allowance of another user's funds. */
  grantee: string;
}
export interface QueryAllowanceRequestProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowanceRequest';
  value: Uint8Array;
}
/** QueryAllowanceRequest is the request type for the Query/Allowance RPC method. */
export interface QueryAllowanceRequestSDKType {
  granter: string;
  grantee: string;
}
/** QueryAllowanceResponse is the response type for the Query/Allowance RPC method. */
export interface QueryAllowanceResponse {
  /** allowance is a allowance granted for grantee by granter. */
  allowance?: Grant;
}
export interface QueryAllowanceResponseProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowanceResponse';
  value: Uint8Array;
}
/** QueryAllowanceResponse is the response type for the Query/Allowance RPC method. */
export interface QueryAllowanceResponseSDKType {
  allowance?: GrantSDKType;
}
/** QueryAllowancesRequest is the request type for the Query/Allowances RPC method. */
export interface QueryAllowancesRequest {
  grantee: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryAllowancesRequestProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesRequest';
  value: Uint8Array;
}
/** QueryAllowancesRequest is the request type for the Query/Allowances RPC method. */
export interface QueryAllowancesRequestSDKType {
  grantee: string;
  pagination?: PageRequestSDKType;
}
/** QueryAllowancesResponse is the response type for the Query/Allowances RPC method. */
export interface QueryAllowancesResponse {
  /** allowances are allowance's granted for grantee by granter. */
  allowances: Grant[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponse;
}
export interface QueryAllowancesResponseProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesResponse';
  value: Uint8Array;
}
/** QueryAllowancesResponse is the response type for the Query/Allowances RPC method. */
export interface QueryAllowancesResponseSDKType {
  allowances: GrantSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryAllowancesByGranterRequest is the request type for the Query/AllowancesByGranter RPC method.
 *
 * Since: cosmos-sdk 0.46
 */
export interface QueryAllowancesByGranterRequest {
  granter: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryAllowancesByGranterRequestProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesByGranterRequest';
  value: Uint8Array;
}
/**
 * QueryAllowancesByGranterRequest is the request type for the Query/AllowancesByGranter RPC method.
 *
 * Since: cosmos-sdk 0.46
 */
export interface QueryAllowancesByGranterRequestSDKType {
  granter: string;
  pagination?: PageRequestSDKType;
}
/**
 * QueryAllowancesByGranterResponse is the response type for the Query/AllowancesByGranter RPC method.
 *
 * Since: cosmos-sdk 0.46
 */
export interface QueryAllowancesByGranterResponse {
  /** allowances that have been issued by the granter. */
  allowances: Grant[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponse;
}
export interface QueryAllowancesByGranterResponseProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesByGranterResponse';
  value: Uint8Array;
}
/**
 * QueryAllowancesByGranterResponse is the response type for the Query/AllowancesByGranter RPC method.
 *
 * Since: cosmos-sdk 0.46
 */
export interface QueryAllowancesByGranterResponseSDKType {
  allowances: GrantSDKType[];
  pagination?: PageResponseSDKType;
}
function createBaseQueryAllowanceRequest(): QueryAllowanceRequest {
  return {
    granter: '',
    grantee: '',
  };
}
export const QueryAllowanceRequest = {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowanceRequest',
  encode(
    message: QueryAllowanceRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllowanceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllowanceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.grantee = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllowanceRequest {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
    };
  },
  toJSON(message: QueryAllowanceRequest): JsonSafe<QueryAllowanceRequest> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    return obj;
  },
  fromPartial(object: Partial<QueryAllowanceRequest>): QueryAllowanceRequest {
    const message = createBaseQueryAllowanceRequest();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    return message;
  },
  fromProtoMsg(message: QueryAllowanceRequestProtoMsg): QueryAllowanceRequest {
    return QueryAllowanceRequest.decode(message.value);
  },
  toProto(message: QueryAllowanceRequest): Uint8Array {
    return QueryAllowanceRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryAllowanceRequest): QueryAllowanceRequestProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowanceRequest',
      value: QueryAllowanceRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllowanceResponse(): QueryAllowanceResponse {
  return {
    allowance: undefined,
  };
}
export const QueryAllowanceResponse = {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowanceResponse',
  encode(
    message: QueryAllowanceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.allowance !== undefined) {
      Grant.encode(message.allowance, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllowanceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllowanceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.allowance = Grant.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllowanceResponse {
    return {
      allowance: isSet(object.allowance)
        ? Grant.fromJSON(object.allowance)
        : undefined,
    };
  },
  toJSON(message: QueryAllowanceResponse): JsonSafe<QueryAllowanceResponse> {
    const obj: any = {};
    message.allowance !== undefined &&
      (obj.allowance = message.allowance
        ? Grant.toJSON(message.allowance)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryAllowanceResponse>): QueryAllowanceResponse {
    const message = createBaseQueryAllowanceResponse();
    message.allowance =
      object.allowance !== undefined && object.allowance !== null
        ? Grant.fromPartial(object.allowance)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllowanceResponseProtoMsg,
  ): QueryAllowanceResponse {
    return QueryAllowanceResponse.decode(message.value);
  },
  toProto(message: QueryAllowanceResponse): Uint8Array {
    return QueryAllowanceResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryAllowanceResponse): QueryAllowanceResponseProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowanceResponse',
      value: QueryAllowanceResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAllowancesRequest(): QueryAllowancesRequest {
  return {
    grantee: '',
    pagination: undefined,
  };
}
export const QueryAllowancesRequest = {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesRequest',
  encode(
    message: QueryAllowancesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.grantee !== '') {
      writer.uint32(10).string(message.grantee);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllowancesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllowancesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grantee = reader.string();
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
  fromJSON(object: any): QueryAllowancesRequest {
    return {
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryAllowancesRequest): JsonSafe<QueryAllowancesRequest> {
    const obj: any = {};
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryAllowancesRequest>): QueryAllowancesRequest {
    const message = createBaseQueryAllowancesRequest();
    message.grantee = object.grantee ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllowancesRequestProtoMsg,
  ): QueryAllowancesRequest {
    return QueryAllowancesRequest.decode(message.value);
  },
  toProto(message: QueryAllowancesRequest): Uint8Array {
    return QueryAllowancesRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryAllowancesRequest): QueryAllowancesRequestProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesRequest',
      value: QueryAllowancesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllowancesResponse(): QueryAllowancesResponse {
  return {
    allowances: [],
    pagination: undefined,
  };
}
export const QueryAllowancesResponse = {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesResponse',
  encode(
    message: QueryAllowancesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.allowances) {
      Grant.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllowancesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllowancesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.allowances.push(Grant.decode(reader, reader.uint32()));
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
  fromJSON(object: any): QueryAllowancesResponse {
    return {
      allowances: Array.isArray(object?.allowances)
        ? object.allowances.map((e: any) => Grant.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryAllowancesResponse): JsonSafe<QueryAllowancesResponse> {
    const obj: any = {};
    if (message.allowances) {
      obj.allowances = message.allowances.map(e =>
        e ? Grant.toJSON(e) : undefined,
      );
    } else {
      obj.allowances = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllowancesResponse>,
  ): QueryAllowancesResponse {
    const message = createBaseQueryAllowancesResponse();
    message.allowances =
      object.allowances?.map(e => Grant.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllowancesResponseProtoMsg,
  ): QueryAllowancesResponse {
    return QueryAllowancesResponse.decode(message.value);
  },
  toProto(message: QueryAllowancesResponse): Uint8Array {
    return QueryAllowancesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllowancesResponse,
  ): QueryAllowancesResponseProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesResponse',
      value: QueryAllowancesResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAllowancesByGranterRequest(): QueryAllowancesByGranterRequest {
  return {
    granter: '',
    pagination: undefined,
  };
}
export const QueryAllowancesByGranterRequest = {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesByGranterRequest',
  encode(
    message: QueryAllowancesByGranterRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllowancesByGranterRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllowancesByGranterRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
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
  fromJSON(object: any): QueryAllowancesByGranterRequest {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllowancesByGranterRequest,
  ): JsonSafe<QueryAllowancesByGranterRequest> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllowancesByGranterRequest>,
  ): QueryAllowancesByGranterRequest {
    const message = createBaseQueryAllowancesByGranterRequest();
    message.granter = object.granter ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllowancesByGranterRequestProtoMsg,
  ): QueryAllowancesByGranterRequest {
    return QueryAllowancesByGranterRequest.decode(message.value);
  },
  toProto(message: QueryAllowancesByGranterRequest): Uint8Array {
    return QueryAllowancesByGranterRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllowancesByGranterRequest,
  ): QueryAllowancesByGranterRequestProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesByGranterRequest',
      value: QueryAllowancesByGranterRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllowancesByGranterResponse(): QueryAllowancesByGranterResponse {
  return {
    allowances: [],
    pagination: undefined,
  };
}
export const QueryAllowancesByGranterResponse = {
  typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesByGranterResponse',
  encode(
    message: QueryAllowancesByGranterResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.allowances) {
      Grant.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllowancesByGranterResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllowancesByGranterResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.allowances.push(Grant.decode(reader, reader.uint32()));
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
  fromJSON(object: any): QueryAllowancesByGranterResponse {
    return {
      allowances: Array.isArray(object?.allowances)
        ? object.allowances.map((e: any) => Grant.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllowancesByGranterResponse,
  ): JsonSafe<QueryAllowancesByGranterResponse> {
    const obj: any = {};
    if (message.allowances) {
      obj.allowances = message.allowances.map(e =>
        e ? Grant.toJSON(e) : undefined,
      );
    } else {
      obj.allowances = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllowancesByGranterResponse>,
  ): QueryAllowancesByGranterResponse {
    const message = createBaseQueryAllowancesByGranterResponse();
    message.allowances =
      object.allowances?.map(e => Grant.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllowancesByGranterResponseProtoMsg,
  ): QueryAllowancesByGranterResponse {
    return QueryAllowancesByGranterResponse.decode(message.value);
  },
  toProto(message: QueryAllowancesByGranterResponse): Uint8Array {
    return QueryAllowancesByGranterResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllowancesByGranterResponse,
  ): QueryAllowancesByGranterResponseProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.QueryAllowancesByGranterResponse',
      value: QueryAllowancesByGranterResponse.encode(message).finish(),
    };
  },
};
