//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../base/query/v1beta1/pagination.js';
import {
  Permissions,
  type PermissionsSDKType,
  GenesisAccountPermissions,
  type GenesisAccountPermissionsSDKType,
} from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** QueryAccountRequest is the request type for the Query/Account RPC method. */
export interface QueryAccountRequest {
  address: string;
}
export interface QueryAccountRequestProtoMsg {
  typeUrl: '/cosmos.circuit.v1.QueryAccountRequest';
  value: Uint8Array;
}
/** QueryAccountRequest is the request type for the Query/Account RPC method. */
export interface QueryAccountRequestSDKType {
  address: string;
}
/** AccountResponse is the response type for the Query/Account RPC method. */
export interface AccountResponse {
  permission?: Permissions;
}
export interface AccountResponseProtoMsg {
  typeUrl: '/cosmos.circuit.v1.AccountResponse';
  value: Uint8Array;
}
/** AccountResponse is the response type for the Query/Account RPC method. */
export interface AccountResponseSDKType {
  permission?: PermissionsSDKType;
}
/** QueryAccountsRequest is the request type for the Query/Accounts RPC method. */
export interface QueryAccountsRequest {
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryAccountsRequestProtoMsg {
  typeUrl: '/cosmos.circuit.v1.QueryAccountsRequest';
  value: Uint8Array;
}
/** QueryAccountsRequest is the request type for the Query/Accounts RPC method. */
export interface QueryAccountsRequestSDKType {
  pagination?: PageRequestSDKType;
}
/** AccountsResponse is the response type for the Query/Accounts RPC method. */
export interface AccountsResponse {
  accounts: GenesisAccountPermissions[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface AccountsResponseProtoMsg {
  typeUrl: '/cosmos.circuit.v1.AccountsResponse';
  value: Uint8Array;
}
/** AccountsResponse is the response type for the Query/Accounts RPC method. */
export interface AccountsResponseSDKType {
  accounts: GenesisAccountPermissionsSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryDisableListRequest is the request type for the Query/DisabledList RPC method. */
export interface QueryDisabledListRequest {}
export interface QueryDisabledListRequestProtoMsg {
  typeUrl: '/cosmos.circuit.v1.QueryDisabledListRequest';
  value: Uint8Array;
}
/** QueryDisableListRequest is the request type for the Query/DisabledList RPC method. */
export interface QueryDisabledListRequestSDKType {}
/** DisabledListResponse is the response type for the Query/DisabledList RPC method. */
export interface DisabledListResponse {
  disabledList: string[];
}
export interface DisabledListResponseProtoMsg {
  typeUrl: '/cosmos.circuit.v1.DisabledListResponse';
  value: Uint8Array;
}
/** DisabledListResponse is the response type for the Query/DisabledList RPC method. */
export interface DisabledListResponseSDKType {
  disabled_list: string[];
}
function createBaseQueryAccountRequest(): QueryAccountRequest {
  return {
    address: '',
  };
}
export const QueryAccountRequest = {
  typeUrl: '/cosmos.circuit.v1.QueryAccountRequest' as const,
  encode(
    message: QueryAccountRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAccountRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAccountRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAccountRequest {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(message: QueryAccountRequest): JsonSafe<QueryAccountRequest> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(object: Partial<QueryAccountRequest>): QueryAccountRequest {
    const message = createBaseQueryAccountRequest();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(message: QueryAccountRequestProtoMsg): QueryAccountRequest {
    return QueryAccountRequest.decode(message.value);
  },
  toProto(message: QueryAccountRequest): Uint8Array {
    return QueryAccountRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryAccountRequest): QueryAccountRequestProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.QueryAccountRequest',
      value: QueryAccountRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountResponse(): AccountResponse {
  return {
    permission: undefined,
  };
}
export const AccountResponse = {
  typeUrl: '/cosmos.circuit.v1.AccountResponse' as const,
  encode(
    message: AccountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.permission !== undefined) {
      Permissions.encode(message.permission, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.permission = Permissions.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountResponse {
    return {
      permission: isSet(object.permission)
        ? Permissions.fromJSON(object.permission)
        : undefined,
    };
  },
  toJSON(message: AccountResponse): JsonSafe<AccountResponse> {
    const obj: any = {};
    message.permission !== undefined &&
      (obj.permission = message.permission
        ? Permissions.toJSON(message.permission)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<AccountResponse>): AccountResponse {
    const message = createBaseAccountResponse();
    message.permission =
      object.permission !== undefined && object.permission !== null
        ? Permissions.fromPartial(object.permission)
        : undefined;
    return message;
  },
  fromProtoMsg(message: AccountResponseProtoMsg): AccountResponse {
    return AccountResponse.decode(message.value);
  },
  toProto(message: AccountResponse): Uint8Array {
    return AccountResponse.encode(message).finish();
  },
  toProtoMsg(message: AccountResponse): AccountResponseProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.AccountResponse',
      value: AccountResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAccountsRequest(): QueryAccountsRequest {
  return {
    pagination: undefined,
  };
}
export const QueryAccountsRequest = {
  typeUrl: '/cosmos.circuit.v1.QueryAccountsRequest' as const,
  encode(
    message: QueryAccountsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAccountsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAccountsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAccountsRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryAccountsRequest): JsonSafe<QueryAccountsRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryAccountsRequest>): QueryAccountsRequest {
    const message = createBaseQueryAccountsRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryAccountsRequestProtoMsg): QueryAccountsRequest {
    return QueryAccountsRequest.decode(message.value);
  },
  toProto(message: QueryAccountsRequest): Uint8Array {
    return QueryAccountsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryAccountsRequest): QueryAccountsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.QueryAccountsRequest',
      value: QueryAccountsRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountsResponse(): AccountsResponse {
  return {
    accounts: [],
    pagination: undefined,
  };
}
export const AccountsResponse = {
  typeUrl: '/cosmos.circuit.v1.AccountsResponse' as const,
  encode(
    message: AccountsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.accounts) {
      GenesisAccountPermissions.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AccountsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.accounts.push(
            GenesisAccountPermissions.decode(reader, reader.uint32()),
          );
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
  fromJSON(object: any): AccountsResponse {
    return {
      accounts: Array.isArray(object?.accounts)
        ? object.accounts.map((e: any) => GenesisAccountPermissions.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: AccountsResponse): JsonSafe<AccountsResponse> {
    const obj: any = {};
    if (message.accounts) {
      obj.accounts = message.accounts.map(e =>
        e ? GenesisAccountPermissions.toJSON(e) : undefined,
      );
    } else {
      obj.accounts = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<AccountsResponse>): AccountsResponse {
    const message = createBaseAccountsResponse();
    message.accounts =
      object.accounts?.map(e => GenesisAccountPermissions.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: AccountsResponseProtoMsg): AccountsResponse {
    return AccountsResponse.decode(message.value);
  },
  toProto(message: AccountsResponse): Uint8Array {
    return AccountsResponse.encode(message).finish();
  },
  toProtoMsg(message: AccountsResponse): AccountsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.AccountsResponse',
      value: AccountsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDisabledListRequest(): QueryDisabledListRequest {
  return {};
}
export const QueryDisabledListRequest = {
  typeUrl: '/cosmos.circuit.v1.QueryDisabledListRequest' as const,
  encode(
    _: QueryDisabledListRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDisabledListRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDisabledListRequest();
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
  fromJSON(_: any): QueryDisabledListRequest {
    return {};
  },
  toJSON(_: QueryDisabledListRequest): JsonSafe<QueryDisabledListRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryDisabledListRequest>): QueryDisabledListRequest {
    const message = createBaseQueryDisabledListRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryDisabledListRequestProtoMsg,
  ): QueryDisabledListRequest {
    return QueryDisabledListRequest.decode(message.value);
  },
  toProto(message: QueryDisabledListRequest): Uint8Array {
    return QueryDisabledListRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDisabledListRequest,
  ): QueryDisabledListRequestProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.QueryDisabledListRequest',
      value: QueryDisabledListRequest.encode(message).finish(),
    };
  },
};
function createBaseDisabledListResponse(): DisabledListResponse {
  return {
    disabledList: [],
  };
}
export const DisabledListResponse = {
  typeUrl: '/cosmos.circuit.v1.DisabledListResponse' as const,
  encode(
    message: DisabledListResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.disabledList) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DisabledListResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDisabledListResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.disabledList.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DisabledListResponse {
    return {
      disabledList: Array.isArray(object?.disabledList)
        ? object.disabledList.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: DisabledListResponse): JsonSafe<DisabledListResponse> {
    const obj: any = {};
    if (message.disabledList) {
      obj.disabledList = message.disabledList.map(e => e);
    } else {
      obj.disabledList = [];
    }
    return obj;
  },
  fromPartial(object: Partial<DisabledListResponse>): DisabledListResponse {
    const message = createBaseDisabledListResponse();
    message.disabledList = object.disabledList?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: DisabledListResponseProtoMsg): DisabledListResponse {
    return DisabledListResponse.decode(message.value);
  },
  toProto(message: DisabledListResponse): Uint8Array {
    return DisabledListResponse.encode(message).finish();
  },
  toProtoMsg(message: DisabledListResponse): DisabledListResponseProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.DisabledListResponse',
      value: DisabledListResponse.encode(message).finish(),
    };
  },
};
