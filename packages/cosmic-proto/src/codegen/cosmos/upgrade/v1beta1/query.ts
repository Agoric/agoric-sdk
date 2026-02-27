//@ts-nocheck
import {
  Plan,
  type PlanSDKType,
  ModuleVersion,
  type ModuleVersionSDKType,
} from './upgrade.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * QueryCurrentPlanRequest is the request type for the Query/CurrentPlan RPC
 * method.
 * @name QueryCurrentPlanRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryCurrentPlanRequest
 */
export interface QueryCurrentPlanRequest {}
export interface QueryCurrentPlanRequestProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryCurrentPlanRequest';
  value: Uint8Array;
}
/**
 * QueryCurrentPlanRequest is the request type for the Query/CurrentPlan RPC
 * method.
 * @name QueryCurrentPlanRequestSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryCurrentPlanRequest
 */
export interface QueryCurrentPlanRequestSDKType {}
/**
 * QueryCurrentPlanResponse is the response type for the Query/CurrentPlan RPC
 * method.
 * @name QueryCurrentPlanResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryCurrentPlanResponse
 */
export interface QueryCurrentPlanResponse {
  /**
   * plan is the current upgrade plan.
   */
  plan?: Plan;
}
export interface QueryCurrentPlanResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryCurrentPlanResponse';
  value: Uint8Array;
}
/**
 * QueryCurrentPlanResponse is the response type for the Query/CurrentPlan RPC
 * method.
 * @name QueryCurrentPlanResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryCurrentPlanResponse
 */
export interface QueryCurrentPlanResponseSDKType {
  plan?: PlanSDKType;
}
/**
 * QueryCurrentPlanRequest is the request type for the Query/AppliedPlan RPC
 * method.
 * @name QueryAppliedPlanRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAppliedPlanRequest
 */
export interface QueryAppliedPlanRequest {
  /**
   * name is the name of the applied plan to query for.
   */
  name: string;
}
export interface QueryAppliedPlanRequestProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAppliedPlanRequest';
  value: Uint8Array;
}
/**
 * QueryCurrentPlanRequest is the request type for the Query/AppliedPlan RPC
 * method.
 * @name QueryAppliedPlanRequestSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAppliedPlanRequest
 */
export interface QueryAppliedPlanRequestSDKType {
  name: string;
}
/**
 * QueryAppliedPlanResponse is the response type for the Query/AppliedPlan RPC
 * method.
 * @name QueryAppliedPlanResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAppliedPlanResponse
 */
export interface QueryAppliedPlanResponse {
  /**
   * height is the block height at which the plan was applied.
   */
  height: bigint;
}
export interface QueryAppliedPlanResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAppliedPlanResponse';
  value: Uint8Array;
}
/**
 * QueryAppliedPlanResponse is the response type for the Query/AppliedPlan RPC
 * method.
 * @name QueryAppliedPlanResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAppliedPlanResponse
 */
export interface QueryAppliedPlanResponseSDKType {
  height: bigint;
}
/**
 * QueryUpgradedConsensusStateRequest is the request type for the Query/UpgradedConsensusState
 * RPC method.
 * @name QueryUpgradedConsensusStateRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateRequest
 * @deprecated
 */
export interface QueryUpgradedConsensusStateRequest {
  /**
   * last height of the current chain must be sent in request
   * as this is the height under which next consensus state is stored
   */
  lastHeight: bigint;
}
export interface QueryUpgradedConsensusStateRequestProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateRequest';
  value: Uint8Array;
}
/**
 * QueryUpgradedConsensusStateRequest is the request type for the Query/UpgradedConsensusState
 * RPC method.
 * @name QueryUpgradedConsensusStateRequestSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateRequest
 * @deprecated
 */
export interface QueryUpgradedConsensusStateRequestSDKType {
  last_height: bigint;
}
/**
 * QueryUpgradedConsensusStateResponse is the response type for the Query/UpgradedConsensusState
 * RPC method.
 * @name QueryUpgradedConsensusStateResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateResponse
 * @deprecated
 */
export interface QueryUpgradedConsensusStateResponse {
  /**
   * Since: cosmos-sdk 0.43
   */
  upgradedConsensusState: Uint8Array;
}
export interface QueryUpgradedConsensusStateResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateResponse';
  value: Uint8Array;
}
/**
 * QueryUpgradedConsensusStateResponse is the response type for the Query/UpgradedConsensusState
 * RPC method.
 * @name QueryUpgradedConsensusStateResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateResponse
 * @deprecated
 */
export interface QueryUpgradedConsensusStateResponseSDKType {
  upgraded_consensus_state: Uint8Array;
}
/**
 * QueryModuleVersionsRequest is the request type for the Query/ModuleVersions
 * RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryModuleVersionsRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryModuleVersionsRequest
 */
export interface QueryModuleVersionsRequest {
  /**
   * module_name is a field to query a specific module
   * consensus version from state. Leaving this empty will
   * fetch the full list of module versions from state
   */
  moduleName: string;
}
export interface QueryModuleVersionsRequestProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryModuleVersionsRequest';
  value: Uint8Array;
}
/**
 * QueryModuleVersionsRequest is the request type for the Query/ModuleVersions
 * RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryModuleVersionsRequestSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryModuleVersionsRequest
 */
export interface QueryModuleVersionsRequestSDKType {
  module_name: string;
}
/**
 * QueryModuleVersionsResponse is the response type for the Query/ModuleVersions
 * RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryModuleVersionsResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryModuleVersionsResponse
 */
export interface QueryModuleVersionsResponse {
  /**
   * module_versions is a list of module names with their consensus versions.
   */
  moduleVersions: ModuleVersion[];
}
export interface QueryModuleVersionsResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryModuleVersionsResponse';
  value: Uint8Array;
}
/**
 * QueryModuleVersionsResponse is the response type for the Query/ModuleVersions
 * RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryModuleVersionsResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryModuleVersionsResponse
 */
export interface QueryModuleVersionsResponseSDKType {
  module_versions: ModuleVersionSDKType[];
}
/**
 * QueryAuthorityRequest is the request type for Query/Authority
 *
 * Since: cosmos-sdk 0.46
 * @name QueryAuthorityRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAuthorityRequest
 */
export interface QueryAuthorityRequest {}
export interface QueryAuthorityRequestProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAuthorityRequest';
  value: Uint8Array;
}
/**
 * QueryAuthorityRequest is the request type for Query/Authority
 *
 * Since: cosmos-sdk 0.46
 * @name QueryAuthorityRequestSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAuthorityRequest
 */
export interface QueryAuthorityRequestSDKType {}
/**
 * QueryAuthorityResponse is the response type for Query/Authority
 *
 * Since: cosmos-sdk 0.46
 * @name QueryAuthorityResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAuthorityResponse
 */
export interface QueryAuthorityResponse {
  address: string;
}
export interface QueryAuthorityResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAuthorityResponse';
  value: Uint8Array;
}
/**
 * QueryAuthorityResponse is the response type for Query/Authority
 *
 * Since: cosmos-sdk 0.46
 * @name QueryAuthorityResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAuthorityResponse
 */
export interface QueryAuthorityResponseSDKType {
  address: string;
}
function createBaseQueryCurrentPlanRequest(): QueryCurrentPlanRequest {
  return {};
}
/**
 * QueryCurrentPlanRequest is the request type for the Query/CurrentPlan RPC
 * method.
 * @name QueryCurrentPlanRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryCurrentPlanRequest
 */
export const QueryCurrentPlanRequest = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryCurrentPlanRequest' as const,
  aminoType: 'cosmos-sdk/QueryCurrentPlanRequest' as const,
  is(o: any): o is QueryCurrentPlanRequest {
    return o && o.$typeUrl === QueryCurrentPlanRequest.typeUrl;
  },
  isSDK(o: any): o is QueryCurrentPlanRequestSDKType {
    return o && o.$typeUrl === QueryCurrentPlanRequest.typeUrl;
  },
  encode(
    _: QueryCurrentPlanRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCurrentPlanRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCurrentPlanRequest();
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
  fromJSON(_: any): QueryCurrentPlanRequest {
    return {};
  },
  toJSON(_: QueryCurrentPlanRequest): JsonSafe<QueryCurrentPlanRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryCurrentPlanRequest>): QueryCurrentPlanRequest {
    const message = createBaseQueryCurrentPlanRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryCurrentPlanRequestProtoMsg,
  ): QueryCurrentPlanRequest {
    return QueryCurrentPlanRequest.decode(message.value);
  },
  toProto(message: QueryCurrentPlanRequest): Uint8Array {
    return QueryCurrentPlanRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCurrentPlanRequest,
  ): QueryCurrentPlanRequestProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryCurrentPlanRequest',
      value: QueryCurrentPlanRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryCurrentPlanResponse(): QueryCurrentPlanResponse {
  return {
    plan: undefined,
  };
}
/**
 * QueryCurrentPlanResponse is the response type for the Query/CurrentPlan RPC
 * method.
 * @name QueryCurrentPlanResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryCurrentPlanResponse
 */
export const QueryCurrentPlanResponse = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryCurrentPlanResponse' as const,
  aminoType: 'cosmos-sdk/QueryCurrentPlanResponse' as const,
  is(o: any): o is QueryCurrentPlanResponse {
    return o && o.$typeUrl === QueryCurrentPlanResponse.typeUrl;
  },
  isSDK(o: any): o is QueryCurrentPlanResponseSDKType {
    return o && o.$typeUrl === QueryCurrentPlanResponse.typeUrl;
  },
  encode(
    message: QueryCurrentPlanResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.plan !== undefined) {
      Plan.encode(message.plan, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCurrentPlanResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCurrentPlanResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.plan = Plan.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCurrentPlanResponse {
    return {
      plan: isSet(object.plan) ? Plan.fromJSON(object.plan) : undefined,
    };
  },
  toJSON(
    message: QueryCurrentPlanResponse,
  ): JsonSafe<QueryCurrentPlanResponse> {
    const obj: any = {};
    message.plan !== undefined &&
      (obj.plan = message.plan ? Plan.toJSON(message.plan) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryCurrentPlanResponse>,
  ): QueryCurrentPlanResponse {
    const message = createBaseQueryCurrentPlanResponse();
    message.plan =
      object.plan !== undefined && object.plan !== null
        ? Plan.fromPartial(object.plan)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryCurrentPlanResponseProtoMsg,
  ): QueryCurrentPlanResponse {
    return QueryCurrentPlanResponse.decode(message.value);
  },
  toProto(message: QueryCurrentPlanResponse): Uint8Array {
    return QueryCurrentPlanResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCurrentPlanResponse,
  ): QueryCurrentPlanResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryCurrentPlanResponse',
      value: QueryCurrentPlanResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAppliedPlanRequest(): QueryAppliedPlanRequest {
  return {
    name: '',
  };
}
/**
 * QueryCurrentPlanRequest is the request type for the Query/AppliedPlan RPC
 * method.
 * @name QueryAppliedPlanRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAppliedPlanRequest
 */
export const QueryAppliedPlanRequest = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAppliedPlanRequest' as const,
  aminoType: 'cosmos-sdk/QueryAppliedPlanRequest' as const,
  is(o: any): o is QueryAppliedPlanRequest {
    return (
      o &&
      (o.$typeUrl === QueryAppliedPlanRequest.typeUrl ||
        typeof o.name === 'string')
    );
  },
  isSDK(o: any): o is QueryAppliedPlanRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryAppliedPlanRequest.typeUrl ||
        typeof o.name === 'string')
    );
  },
  encode(
    message: QueryAppliedPlanRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAppliedPlanRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAppliedPlanRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAppliedPlanRequest {
    return {
      name: isSet(object.name) ? String(object.name) : '',
    };
  },
  toJSON(message: QueryAppliedPlanRequest): JsonSafe<QueryAppliedPlanRequest> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAppliedPlanRequest>,
  ): QueryAppliedPlanRequest {
    const message = createBaseQueryAppliedPlanRequest();
    message.name = object.name ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryAppliedPlanRequestProtoMsg,
  ): QueryAppliedPlanRequest {
    return QueryAppliedPlanRequest.decode(message.value);
  },
  toProto(message: QueryAppliedPlanRequest): Uint8Array {
    return QueryAppliedPlanRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAppliedPlanRequest,
  ): QueryAppliedPlanRequestProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryAppliedPlanRequest',
      value: QueryAppliedPlanRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAppliedPlanResponse(): QueryAppliedPlanResponse {
  return {
    height: BigInt(0),
  };
}
/**
 * QueryAppliedPlanResponse is the response type for the Query/AppliedPlan RPC
 * method.
 * @name QueryAppliedPlanResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAppliedPlanResponse
 */
export const QueryAppliedPlanResponse = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAppliedPlanResponse' as const,
  aminoType: 'cosmos-sdk/QueryAppliedPlanResponse' as const,
  is(o: any): o is QueryAppliedPlanResponse {
    return (
      o &&
      (o.$typeUrl === QueryAppliedPlanResponse.typeUrl ||
        typeof o.height === 'bigint')
    );
  },
  isSDK(o: any): o is QueryAppliedPlanResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryAppliedPlanResponse.typeUrl ||
        typeof o.height === 'bigint')
    );
  },
  encode(
    message: QueryAppliedPlanResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== BigInt(0)) {
      writer.uint32(8).int64(message.height);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAppliedPlanResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAppliedPlanResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAppliedPlanResponse {
    return {
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryAppliedPlanResponse,
  ): JsonSafe<QueryAppliedPlanResponse> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryAppliedPlanResponse>,
  ): QueryAppliedPlanResponse {
    const message = createBaseQueryAppliedPlanResponse();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryAppliedPlanResponseProtoMsg,
  ): QueryAppliedPlanResponse {
    return QueryAppliedPlanResponse.decode(message.value);
  },
  toProto(message: QueryAppliedPlanResponse): Uint8Array {
    return QueryAppliedPlanResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAppliedPlanResponse,
  ): QueryAppliedPlanResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryAppliedPlanResponse',
      value: QueryAppliedPlanResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryUpgradedConsensusStateRequest(): QueryUpgradedConsensusStateRequest {
  return {
    lastHeight: BigInt(0),
  };
}
/**
 * QueryUpgradedConsensusStateRequest is the request type for the Query/UpgradedConsensusState
 * RPC method.
 * @name QueryUpgradedConsensusStateRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateRequest
 * @deprecated
 */
export const QueryUpgradedConsensusStateRequest = {
  typeUrl:
    '/cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateRequest' as const,
  aminoType: 'cosmos-sdk/QueryUpgradedConsensusStateRequest' as const,
  is(o: any): o is QueryUpgradedConsensusStateRequest {
    return (
      o &&
      (o.$typeUrl === QueryUpgradedConsensusStateRequest.typeUrl ||
        typeof o.lastHeight === 'bigint')
    );
  },
  isSDK(o: any): o is QueryUpgradedConsensusStateRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryUpgradedConsensusStateRequest.typeUrl ||
        typeof o.last_height === 'bigint')
    );
  },
  encode(
    message: QueryUpgradedConsensusStateRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lastHeight !== BigInt(0)) {
      writer.uint32(8).int64(message.lastHeight);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUpgradedConsensusStateRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUpgradedConsensusStateRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lastHeight = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUpgradedConsensusStateRequest {
    return {
      lastHeight: isSet(object.lastHeight)
        ? BigInt(object.lastHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryUpgradedConsensusStateRequest,
  ): JsonSafe<QueryUpgradedConsensusStateRequest> {
    const obj: any = {};
    message.lastHeight !== undefined &&
      (obj.lastHeight = (message.lastHeight || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryUpgradedConsensusStateRequest>,
  ): QueryUpgradedConsensusStateRequest {
    const message = createBaseQueryUpgradedConsensusStateRequest();
    message.lastHeight =
      object.lastHeight !== undefined && object.lastHeight !== null
        ? BigInt(object.lastHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryUpgradedConsensusStateRequestProtoMsg,
  ): QueryUpgradedConsensusStateRequest {
    return QueryUpgradedConsensusStateRequest.decode(message.value);
  },
  toProto(message: QueryUpgradedConsensusStateRequest): Uint8Array {
    return QueryUpgradedConsensusStateRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUpgradedConsensusStateRequest,
  ): QueryUpgradedConsensusStateRequestProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateRequest',
      value: QueryUpgradedConsensusStateRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryUpgradedConsensusStateResponse(): QueryUpgradedConsensusStateResponse {
  return {
    upgradedConsensusState: new Uint8Array(),
  };
}
/**
 * QueryUpgradedConsensusStateResponse is the response type for the Query/UpgradedConsensusState
 * RPC method.
 * @name QueryUpgradedConsensusStateResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateResponse
 * @deprecated
 */
export const QueryUpgradedConsensusStateResponse = {
  typeUrl:
    '/cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateResponse' as const,
  aminoType: 'cosmos-sdk/QueryUpgradedConsensusStateResponse' as const,
  is(o: any): o is QueryUpgradedConsensusStateResponse {
    return (
      o &&
      (o.$typeUrl === QueryUpgradedConsensusStateResponse.typeUrl ||
        o.upgradedConsensusState instanceof Uint8Array ||
        typeof o.upgradedConsensusState === 'string')
    );
  },
  isSDK(o: any): o is QueryUpgradedConsensusStateResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryUpgradedConsensusStateResponse.typeUrl ||
        o.upgraded_consensus_state instanceof Uint8Array ||
        typeof o.upgraded_consensus_state === 'string')
    );
  },
  encode(
    message: QueryUpgradedConsensusStateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.upgradedConsensusState.length !== 0) {
      writer.uint32(18).bytes(message.upgradedConsensusState);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUpgradedConsensusStateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUpgradedConsensusStateResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.upgradedConsensusState = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUpgradedConsensusStateResponse {
    return {
      upgradedConsensusState: isSet(object.upgradedConsensusState)
        ? bytesFromBase64(object.upgradedConsensusState)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: QueryUpgradedConsensusStateResponse,
  ): JsonSafe<QueryUpgradedConsensusStateResponse> {
    const obj: any = {};
    message.upgradedConsensusState !== undefined &&
      (obj.upgradedConsensusState = base64FromBytes(
        message.upgradedConsensusState !== undefined
          ? message.upgradedConsensusState
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<QueryUpgradedConsensusStateResponse>,
  ): QueryUpgradedConsensusStateResponse {
    const message = createBaseQueryUpgradedConsensusStateResponse();
    message.upgradedConsensusState =
      object.upgradedConsensusState ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: QueryUpgradedConsensusStateResponseProtoMsg,
  ): QueryUpgradedConsensusStateResponse {
    return QueryUpgradedConsensusStateResponse.decode(message.value);
  },
  toProto(message: QueryUpgradedConsensusStateResponse): Uint8Array {
    return QueryUpgradedConsensusStateResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUpgradedConsensusStateResponse,
  ): QueryUpgradedConsensusStateResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryUpgradedConsensusStateResponse',
      value: QueryUpgradedConsensusStateResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryModuleVersionsRequest(): QueryModuleVersionsRequest {
  return {
    moduleName: '',
  };
}
/**
 * QueryModuleVersionsRequest is the request type for the Query/ModuleVersions
 * RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryModuleVersionsRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryModuleVersionsRequest
 */
export const QueryModuleVersionsRequest = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryModuleVersionsRequest' as const,
  aminoType: 'cosmos-sdk/QueryModuleVersionsRequest' as const,
  is(o: any): o is QueryModuleVersionsRequest {
    return (
      o &&
      (o.$typeUrl === QueryModuleVersionsRequest.typeUrl ||
        typeof o.moduleName === 'string')
    );
  },
  isSDK(o: any): o is QueryModuleVersionsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryModuleVersionsRequest.typeUrl ||
        typeof o.module_name === 'string')
    );
  },
  encode(
    message: QueryModuleVersionsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.moduleName !== '') {
      writer.uint32(10).string(message.moduleName);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryModuleVersionsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryModuleVersionsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.moduleName = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryModuleVersionsRequest {
    return {
      moduleName: isSet(object.moduleName) ? String(object.moduleName) : '',
    };
  },
  toJSON(
    message: QueryModuleVersionsRequest,
  ): JsonSafe<QueryModuleVersionsRequest> {
    const obj: any = {};
    message.moduleName !== undefined && (obj.moduleName = message.moduleName);
    return obj;
  },
  fromPartial(
    object: Partial<QueryModuleVersionsRequest>,
  ): QueryModuleVersionsRequest {
    const message = createBaseQueryModuleVersionsRequest();
    message.moduleName = object.moduleName ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryModuleVersionsRequestProtoMsg,
  ): QueryModuleVersionsRequest {
    return QueryModuleVersionsRequest.decode(message.value);
  },
  toProto(message: QueryModuleVersionsRequest): Uint8Array {
    return QueryModuleVersionsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryModuleVersionsRequest,
  ): QueryModuleVersionsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryModuleVersionsRequest',
      value: QueryModuleVersionsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryModuleVersionsResponse(): QueryModuleVersionsResponse {
  return {
    moduleVersions: [],
  };
}
/**
 * QueryModuleVersionsResponse is the response type for the Query/ModuleVersions
 * RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryModuleVersionsResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryModuleVersionsResponse
 */
export const QueryModuleVersionsResponse = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryModuleVersionsResponse' as const,
  aminoType: 'cosmos-sdk/QueryModuleVersionsResponse' as const,
  is(o: any): o is QueryModuleVersionsResponse {
    return (
      o &&
      (o.$typeUrl === QueryModuleVersionsResponse.typeUrl ||
        (Array.isArray(o.moduleVersions) &&
          (!o.moduleVersions.length || ModuleVersion.is(o.moduleVersions[0]))))
    );
  },
  isSDK(o: any): o is QueryModuleVersionsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryModuleVersionsResponse.typeUrl ||
        (Array.isArray(o.module_versions) &&
          (!o.module_versions.length ||
            ModuleVersion.isSDK(o.module_versions[0]))))
    );
  },
  encode(
    message: QueryModuleVersionsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.moduleVersions) {
      ModuleVersion.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryModuleVersionsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryModuleVersionsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.moduleVersions.push(
            ModuleVersion.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryModuleVersionsResponse {
    return {
      moduleVersions: Array.isArray(object?.moduleVersions)
        ? object.moduleVersions.map((e: any) => ModuleVersion.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryModuleVersionsResponse,
  ): JsonSafe<QueryModuleVersionsResponse> {
    const obj: any = {};
    if (message.moduleVersions) {
      obj.moduleVersions = message.moduleVersions.map(e =>
        e ? ModuleVersion.toJSON(e) : undefined,
      );
    } else {
      obj.moduleVersions = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryModuleVersionsResponse>,
  ): QueryModuleVersionsResponse {
    const message = createBaseQueryModuleVersionsResponse();
    message.moduleVersions =
      object.moduleVersions?.map(e => ModuleVersion.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryModuleVersionsResponseProtoMsg,
  ): QueryModuleVersionsResponse {
    return QueryModuleVersionsResponse.decode(message.value);
  },
  toProto(message: QueryModuleVersionsResponse): Uint8Array {
    return QueryModuleVersionsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryModuleVersionsResponse,
  ): QueryModuleVersionsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryModuleVersionsResponse',
      value: QueryModuleVersionsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAuthorityRequest(): QueryAuthorityRequest {
  return {};
}
/**
 * QueryAuthorityRequest is the request type for Query/Authority
 *
 * Since: cosmos-sdk 0.46
 * @name QueryAuthorityRequest
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAuthorityRequest
 */
export const QueryAuthorityRequest = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAuthorityRequest' as const,
  aminoType: 'cosmos-sdk/QueryAuthorityRequest' as const,
  is(o: any): o is QueryAuthorityRequest {
    return o && o.$typeUrl === QueryAuthorityRequest.typeUrl;
  },
  isSDK(o: any): o is QueryAuthorityRequestSDKType {
    return o && o.$typeUrl === QueryAuthorityRequest.typeUrl;
  },
  encode(
    _: QueryAuthorityRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAuthorityRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAuthorityRequest();
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
  fromJSON(_: any): QueryAuthorityRequest {
    return {};
  },
  toJSON(_: QueryAuthorityRequest): JsonSafe<QueryAuthorityRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryAuthorityRequest>): QueryAuthorityRequest {
    const message = createBaseQueryAuthorityRequest();
    return message;
  },
  fromProtoMsg(message: QueryAuthorityRequestProtoMsg): QueryAuthorityRequest {
    return QueryAuthorityRequest.decode(message.value);
  },
  toProto(message: QueryAuthorityRequest): Uint8Array {
    return QueryAuthorityRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryAuthorityRequest): QueryAuthorityRequestProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryAuthorityRequest',
      value: QueryAuthorityRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAuthorityResponse(): QueryAuthorityResponse {
  return {
    address: '',
  };
}
/**
 * QueryAuthorityResponse is the response type for Query/Authority
 *
 * Since: cosmos-sdk 0.46
 * @name QueryAuthorityResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.QueryAuthorityResponse
 */
export const QueryAuthorityResponse = {
  typeUrl: '/cosmos.upgrade.v1beta1.QueryAuthorityResponse' as const,
  aminoType: 'cosmos-sdk/QueryAuthorityResponse' as const,
  is(o: any): o is QueryAuthorityResponse {
    return (
      o &&
      (o.$typeUrl === QueryAuthorityResponse.typeUrl ||
        typeof o.address === 'string')
    );
  },
  isSDK(o: any): o is QueryAuthorityResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryAuthorityResponse.typeUrl ||
        typeof o.address === 'string')
    );
  },
  encode(
    message: QueryAuthorityResponse,
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
  ): QueryAuthorityResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAuthorityResponse();
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
  fromJSON(object: any): QueryAuthorityResponse {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(message: QueryAuthorityResponse): JsonSafe<QueryAuthorityResponse> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(object: Partial<QueryAuthorityResponse>): QueryAuthorityResponse {
    const message = createBaseQueryAuthorityResponse();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryAuthorityResponseProtoMsg,
  ): QueryAuthorityResponse {
    return QueryAuthorityResponse.decode(message.value);
  },
  toProto(message: QueryAuthorityResponse): Uint8Array {
    return QueryAuthorityResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryAuthorityResponse): QueryAuthorityResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.QueryAuthorityResponse',
      value: QueryAuthorityResponse.encode(message).finish(),
    };
  },
};
