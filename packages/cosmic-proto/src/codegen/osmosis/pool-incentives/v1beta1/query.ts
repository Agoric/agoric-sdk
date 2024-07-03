//@ts-nocheck
import {
  Duration,
  DurationSDKType,
} from '../../../google/protobuf/duration.js';
import {
  DistrInfo,
  DistrInfoSDKType,
  Params,
  ParamsSDKType,
} from './incentives.js';
import { Gauge, GaugeSDKType } from '../../incentives/gauge.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
export interface QueryGaugeIdsRequest {
  poolId: bigint;
}
export interface QueryGaugeIdsRequestProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryGaugeIdsRequest';
  value: Uint8Array;
}
export interface QueryGaugeIdsRequestSDKType {
  pool_id: bigint;
}
export interface QueryGaugeIdsResponse {
  gaugeIdsWithDuration: QueryGaugeIdsResponse_GaugeIdWithDuration[];
}
export interface QueryGaugeIdsResponseProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryGaugeIdsResponse';
  value: Uint8Array;
}
export interface QueryGaugeIdsResponseSDKType {
  gauge_ids_with_duration: QueryGaugeIdsResponse_GaugeIdWithDurationSDKType[];
}
export interface QueryGaugeIdsResponse_GaugeIdWithDuration {
  gaugeId: bigint;
  duration: Duration;
  gaugeIncentivePercentage: string;
}
export interface QueryGaugeIdsResponse_GaugeIdWithDurationProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.GaugeIdWithDuration';
  value: Uint8Array;
}
export interface QueryGaugeIdsResponse_GaugeIdWithDurationSDKType {
  gauge_id: bigint;
  duration: DurationSDKType;
  gauge_incentive_percentage: string;
}
export interface QueryDistrInfoRequest {}
export interface QueryDistrInfoRequestProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryDistrInfoRequest';
  value: Uint8Array;
}
export interface QueryDistrInfoRequestSDKType {}
export interface QueryDistrInfoResponse {
  distrInfo: DistrInfo;
}
export interface QueryDistrInfoResponseProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryDistrInfoResponse';
  value: Uint8Array;
}
export interface QueryDistrInfoResponseSDKType {
  distr_info: DistrInfoSDKType;
}
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryParamsRequest';
  value: Uint8Array;
}
export interface QueryParamsRequestSDKType {}
export interface QueryParamsResponse {
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryParamsResponse';
  value: Uint8Array;
}
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
export interface QueryLockableDurationsRequest {}
export interface QueryLockableDurationsRequestProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryLockableDurationsRequest';
  value: Uint8Array;
}
export interface QueryLockableDurationsRequestSDKType {}
export interface QueryLockableDurationsResponse {
  lockableDurations: Duration[];
}
export interface QueryLockableDurationsResponseProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryLockableDurationsResponse';
  value: Uint8Array;
}
export interface QueryLockableDurationsResponseSDKType {
  lockable_durations: DurationSDKType[];
}
export interface QueryIncentivizedPoolsRequest {}
export interface QueryIncentivizedPoolsRequestProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryIncentivizedPoolsRequest';
  value: Uint8Array;
}
export interface QueryIncentivizedPoolsRequestSDKType {}
export interface IncentivizedPool {
  poolId: bigint;
  lockableDuration: Duration;
  gaugeId: bigint;
}
export interface IncentivizedPoolProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.IncentivizedPool';
  value: Uint8Array;
}
export interface IncentivizedPoolSDKType {
  pool_id: bigint;
  lockable_duration: DurationSDKType;
  gauge_id: bigint;
}
export interface QueryIncentivizedPoolsResponse {
  incentivizedPools: IncentivizedPool[];
}
export interface QueryIncentivizedPoolsResponseProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryIncentivizedPoolsResponse';
  value: Uint8Array;
}
export interface QueryIncentivizedPoolsResponseSDKType {
  incentivized_pools: IncentivizedPoolSDKType[];
}
export interface QueryExternalIncentiveGaugesRequest {}
export interface QueryExternalIncentiveGaugesRequestProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryExternalIncentiveGaugesRequest';
  value: Uint8Array;
}
export interface QueryExternalIncentiveGaugesRequestSDKType {}
export interface QueryExternalIncentiveGaugesResponse {
  data: Gauge[];
}
export interface QueryExternalIncentiveGaugesResponseProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryExternalIncentiveGaugesResponse';
  value: Uint8Array;
}
export interface QueryExternalIncentiveGaugesResponseSDKType {
  data: GaugeSDKType[];
}
function createBaseQueryGaugeIdsRequest(): QueryGaugeIdsRequest {
  return {
    poolId: BigInt(0),
  };
}
export const QueryGaugeIdsRequest = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryGaugeIdsRequest',
  encode(
    message: QueryGaugeIdsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGaugeIdsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGaugeIdsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGaugeIdsRequest {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: QueryGaugeIdsRequest): JsonSafe<QueryGaugeIdsRequest> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<QueryGaugeIdsRequest>): QueryGaugeIdsRequest {
    const message = createBaseQueryGaugeIdsRequest();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: QueryGaugeIdsRequestProtoMsg): QueryGaugeIdsRequest {
    return QueryGaugeIdsRequest.decode(message.value);
  },
  toProto(message: QueryGaugeIdsRequest): Uint8Array {
    return QueryGaugeIdsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGaugeIdsRequest): QueryGaugeIdsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryGaugeIdsRequest',
      value: QueryGaugeIdsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGaugeIdsResponse(): QueryGaugeIdsResponse {
  return {
    gaugeIdsWithDuration: [],
  };
}
export const QueryGaugeIdsResponse = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryGaugeIdsResponse',
  encode(
    message: QueryGaugeIdsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.gaugeIdsWithDuration) {
      QueryGaugeIdsResponse_GaugeIdWithDuration.encode(
        v!,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGaugeIdsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGaugeIdsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.gaugeIdsWithDuration.push(
            QueryGaugeIdsResponse_GaugeIdWithDuration.decode(
              reader,
              reader.uint32(),
            ),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGaugeIdsResponse {
    return {
      gaugeIdsWithDuration: Array.isArray(object?.gaugeIdsWithDuration)
        ? object.gaugeIdsWithDuration.map((e: any) =>
            QueryGaugeIdsResponse_GaugeIdWithDuration.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: QueryGaugeIdsResponse): JsonSafe<QueryGaugeIdsResponse> {
    const obj: any = {};
    if (message.gaugeIdsWithDuration) {
      obj.gaugeIdsWithDuration = message.gaugeIdsWithDuration.map(e =>
        e ? QueryGaugeIdsResponse_GaugeIdWithDuration.toJSON(e) : undefined,
      );
    } else {
      obj.gaugeIdsWithDuration = [];
    }
    return obj;
  },
  fromPartial(object: Partial<QueryGaugeIdsResponse>): QueryGaugeIdsResponse {
    const message = createBaseQueryGaugeIdsResponse();
    message.gaugeIdsWithDuration =
      object.gaugeIdsWithDuration?.map(e =>
        QueryGaugeIdsResponse_GaugeIdWithDuration.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: QueryGaugeIdsResponseProtoMsg): QueryGaugeIdsResponse {
    return QueryGaugeIdsResponse.decode(message.value);
  },
  toProto(message: QueryGaugeIdsResponse): Uint8Array {
    return QueryGaugeIdsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGaugeIdsResponse): QueryGaugeIdsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryGaugeIdsResponse',
      value: QueryGaugeIdsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGaugeIdsResponse_GaugeIdWithDuration(): QueryGaugeIdsResponse_GaugeIdWithDuration {
  return {
    gaugeId: BigInt(0),
    duration: Duration.fromPartial({}),
    gaugeIncentivePercentage: '',
  };
}
export const QueryGaugeIdsResponse_GaugeIdWithDuration = {
  typeUrl: '/osmosis.poolincentives.v1beta1.GaugeIdWithDuration',
  encode(
    message: QueryGaugeIdsResponse_GaugeIdWithDuration,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.gaugeId !== BigInt(0)) {
      writer.uint32(8).uint64(message.gaugeId);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    if (message.gaugeIncentivePercentage !== '') {
      writer.uint32(26).string(message.gaugeIncentivePercentage);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGaugeIdsResponse_GaugeIdWithDuration {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGaugeIdsResponse_GaugeIdWithDuration();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.gaugeId = reader.uint64();
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        case 3:
          message.gaugeIncentivePercentage = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGaugeIdsResponse_GaugeIdWithDuration {
    return {
      gaugeId: isSet(object.gaugeId)
        ? BigInt(object.gaugeId.toString())
        : BigInt(0),
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
      gaugeIncentivePercentage: isSet(object.gaugeIncentivePercentage)
        ? String(object.gaugeIncentivePercentage)
        : '',
    };
  },
  toJSON(
    message: QueryGaugeIdsResponse_GaugeIdWithDuration,
  ): JsonSafe<QueryGaugeIdsResponse_GaugeIdWithDuration> {
    const obj: any = {};
    message.gaugeId !== undefined &&
      (obj.gaugeId = (message.gaugeId || BigInt(0)).toString());
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    message.gaugeIncentivePercentage !== undefined &&
      (obj.gaugeIncentivePercentage = message.gaugeIncentivePercentage);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGaugeIdsResponse_GaugeIdWithDuration>,
  ): QueryGaugeIdsResponse_GaugeIdWithDuration {
    const message = createBaseQueryGaugeIdsResponse_GaugeIdWithDuration();
    message.gaugeId =
      object.gaugeId !== undefined && object.gaugeId !== null
        ? BigInt(object.gaugeId.toString())
        : BigInt(0);
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    message.gaugeIncentivePercentage = object.gaugeIncentivePercentage ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGaugeIdsResponse_GaugeIdWithDurationProtoMsg,
  ): QueryGaugeIdsResponse_GaugeIdWithDuration {
    return QueryGaugeIdsResponse_GaugeIdWithDuration.decode(message.value);
  },
  toProto(message: QueryGaugeIdsResponse_GaugeIdWithDuration): Uint8Array {
    return QueryGaugeIdsResponse_GaugeIdWithDuration.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGaugeIdsResponse_GaugeIdWithDuration,
  ): QueryGaugeIdsResponse_GaugeIdWithDurationProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.GaugeIdWithDuration',
      value: QueryGaugeIdsResponse_GaugeIdWithDuration.encode(message).finish(),
    };
  },
};
function createBaseQueryDistrInfoRequest(): QueryDistrInfoRequest {
  return {};
}
export const QueryDistrInfoRequest = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryDistrInfoRequest',
  encode(
    _: QueryDistrInfoRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDistrInfoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDistrInfoRequest();
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
  fromJSON(_: any): QueryDistrInfoRequest {
    return {};
  },
  toJSON(_: QueryDistrInfoRequest): JsonSafe<QueryDistrInfoRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryDistrInfoRequest>): QueryDistrInfoRequest {
    const message = createBaseQueryDistrInfoRequest();
    return message;
  },
  fromProtoMsg(message: QueryDistrInfoRequestProtoMsg): QueryDistrInfoRequest {
    return QueryDistrInfoRequest.decode(message.value);
  },
  toProto(message: QueryDistrInfoRequest): Uint8Array {
    return QueryDistrInfoRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryDistrInfoRequest): QueryDistrInfoRequestProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryDistrInfoRequest',
      value: QueryDistrInfoRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDistrInfoResponse(): QueryDistrInfoResponse {
  return {
    distrInfo: DistrInfo.fromPartial({}),
  };
}
export const QueryDistrInfoResponse = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryDistrInfoResponse',
  encode(
    message: QueryDistrInfoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.distrInfo !== undefined) {
      DistrInfo.encode(message.distrInfo, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDistrInfoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDistrInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.distrInfo = DistrInfo.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDistrInfoResponse {
    return {
      distrInfo: isSet(object.distrInfo)
        ? DistrInfo.fromJSON(object.distrInfo)
        : undefined,
    };
  },
  toJSON(message: QueryDistrInfoResponse): JsonSafe<QueryDistrInfoResponse> {
    const obj: any = {};
    message.distrInfo !== undefined &&
      (obj.distrInfo = message.distrInfo
        ? DistrInfo.toJSON(message.distrInfo)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryDistrInfoResponse>): QueryDistrInfoResponse {
    const message = createBaseQueryDistrInfoResponse();
    message.distrInfo =
      object.distrInfo !== undefined && object.distrInfo !== null
        ? DistrInfo.fromPartial(object.distrInfo)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryDistrInfoResponseProtoMsg,
  ): QueryDistrInfoResponse {
    return QueryDistrInfoResponse.decode(message.value);
  },
  toProto(message: QueryDistrInfoResponse): Uint8Array {
    return QueryDistrInfoResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryDistrInfoResponse): QueryDistrInfoResponseProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryDistrInfoResponse',
      value: QueryDistrInfoResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
export const QueryParamsRequest = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryParamsRequest',
  encode(
    _: QueryParamsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
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
  fromJSON(_: any): QueryParamsRequest {
    return {};
  },
  toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest {
    const message = createBaseQueryParamsRequest();
    return message;
  },
  fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest {
    return QueryParamsRequest.decode(message.value);
  },
  toProto(message: QueryParamsRequest): Uint8Array {
    return QueryParamsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryParamsRequest',
      value: QueryParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsResponse(): QueryParamsResponse {
  return {
    params: Params.fromPartial({}),
  };
}
export const QueryParamsResponse = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryParamsResponse',
  encode(
    message: QueryParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
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
  fromJSON(object: any): QueryParamsResponse {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse {
    const message = createBaseQueryParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse {
    return QueryParamsResponse.decode(message.value);
  },
  toProto(message: QueryParamsResponse): Uint8Array {
    return QueryParamsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryLockableDurationsRequest(): QueryLockableDurationsRequest {
  return {};
}
export const QueryLockableDurationsRequest = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryLockableDurationsRequest',
  encode(
    _: QueryLockableDurationsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryLockableDurationsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryLockableDurationsRequest();
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
  fromJSON(_: any): QueryLockableDurationsRequest {
    return {};
  },
  toJSON(
    _: QueryLockableDurationsRequest,
  ): JsonSafe<QueryLockableDurationsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryLockableDurationsRequest>,
  ): QueryLockableDurationsRequest {
    const message = createBaseQueryLockableDurationsRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryLockableDurationsRequestProtoMsg,
  ): QueryLockableDurationsRequest {
    return QueryLockableDurationsRequest.decode(message.value);
  },
  toProto(message: QueryLockableDurationsRequest): Uint8Array {
    return QueryLockableDurationsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryLockableDurationsRequest,
  ): QueryLockableDurationsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryLockableDurationsRequest',
      value: QueryLockableDurationsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryLockableDurationsResponse(): QueryLockableDurationsResponse {
  return {
    lockableDurations: [],
  };
}
export const QueryLockableDurationsResponse = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryLockableDurationsResponse',
  encode(
    message: QueryLockableDurationsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.lockableDurations) {
      Duration.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryLockableDurationsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryLockableDurationsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockableDurations.push(
            Duration.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryLockableDurationsResponse {
    return {
      lockableDurations: Array.isArray(object?.lockableDurations)
        ? object.lockableDurations.map((e: any) => Duration.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryLockableDurationsResponse,
  ): JsonSafe<QueryLockableDurationsResponse> {
    const obj: any = {};
    if (message.lockableDurations) {
      obj.lockableDurations = message.lockableDurations.map(e =>
        e ? Duration.toJSON(e) : undefined,
      );
    } else {
      obj.lockableDurations = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryLockableDurationsResponse>,
  ): QueryLockableDurationsResponse {
    const message = createBaseQueryLockableDurationsResponse();
    message.lockableDurations =
      object.lockableDurations?.map(e => Duration.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryLockableDurationsResponseProtoMsg,
  ): QueryLockableDurationsResponse {
    return QueryLockableDurationsResponse.decode(message.value);
  },
  toProto(message: QueryLockableDurationsResponse): Uint8Array {
    return QueryLockableDurationsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryLockableDurationsResponse,
  ): QueryLockableDurationsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryLockableDurationsResponse',
      value: QueryLockableDurationsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryIncentivizedPoolsRequest(): QueryIncentivizedPoolsRequest {
  return {};
}
export const QueryIncentivizedPoolsRequest = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryIncentivizedPoolsRequest',
  encode(
    _: QueryIncentivizedPoolsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryIncentivizedPoolsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryIncentivizedPoolsRequest();
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
  fromJSON(_: any): QueryIncentivizedPoolsRequest {
    return {};
  },
  toJSON(
    _: QueryIncentivizedPoolsRequest,
  ): JsonSafe<QueryIncentivizedPoolsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryIncentivizedPoolsRequest>,
  ): QueryIncentivizedPoolsRequest {
    const message = createBaseQueryIncentivizedPoolsRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryIncentivizedPoolsRequestProtoMsg,
  ): QueryIncentivizedPoolsRequest {
    return QueryIncentivizedPoolsRequest.decode(message.value);
  },
  toProto(message: QueryIncentivizedPoolsRequest): Uint8Array {
    return QueryIncentivizedPoolsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryIncentivizedPoolsRequest,
  ): QueryIncentivizedPoolsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryIncentivizedPoolsRequest',
      value: QueryIncentivizedPoolsRequest.encode(message).finish(),
    };
  },
};
function createBaseIncentivizedPool(): IncentivizedPool {
  return {
    poolId: BigInt(0),
    lockableDuration: Duration.fromPartial({}),
    gaugeId: BigInt(0),
  };
}
export const IncentivizedPool = {
  typeUrl: '/osmosis.poolincentives.v1beta1.IncentivizedPool',
  encode(
    message: IncentivizedPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.lockableDuration !== undefined) {
      Duration.encode(
        message.lockableDuration,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.gaugeId !== BigInt(0)) {
      writer.uint32(24).uint64(message.gaugeId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): IncentivizedPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIncentivizedPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.lockableDuration = Duration.decode(reader, reader.uint32());
          break;
        case 3:
          message.gaugeId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): IncentivizedPool {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      lockableDuration: isSet(object.lockableDuration)
        ? Duration.fromJSON(object.lockableDuration)
        : undefined,
      gaugeId: isSet(object.gaugeId)
        ? BigInt(object.gaugeId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: IncentivizedPool): JsonSafe<IncentivizedPool> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.lockableDuration !== undefined &&
      (obj.lockableDuration = message.lockableDuration
        ? Duration.toJSON(message.lockableDuration)
        : undefined);
    message.gaugeId !== undefined &&
      (obj.gaugeId = (message.gaugeId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<IncentivizedPool>): IncentivizedPool {
    const message = createBaseIncentivizedPool();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.lockableDuration =
      object.lockableDuration !== undefined && object.lockableDuration !== null
        ? Duration.fromPartial(object.lockableDuration)
        : undefined;
    message.gaugeId =
      object.gaugeId !== undefined && object.gaugeId !== null
        ? BigInt(object.gaugeId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: IncentivizedPoolProtoMsg): IncentivizedPool {
    return IncentivizedPool.decode(message.value);
  },
  toProto(message: IncentivizedPool): Uint8Array {
    return IncentivizedPool.encode(message).finish();
  },
  toProtoMsg(message: IncentivizedPool): IncentivizedPoolProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.IncentivizedPool',
      value: IncentivizedPool.encode(message).finish(),
    };
  },
};
function createBaseQueryIncentivizedPoolsResponse(): QueryIncentivizedPoolsResponse {
  return {
    incentivizedPools: [],
  };
}
export const QueryIncentivizedPoolsResponse = {
  typeUrl: '/osmosis.poolincentives.v1beta1.QueryIncentivizedPoolsResponse',
  encode(
    message: QueryIncentivizedPoolsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.incentivizedPools) {
      IncentivizedPool.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryIncentivizedPoolsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryIncentivizedPoolsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.incentivizedPools.push(
            IncentivizedPool.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryIncentivizedPoolsResponse {
    return {
      incentivizedPools: Array.isArray(object?.incentivizedPools)
        ? object.incentivizedPools.map((e: any) => IncentivizedPool.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryIncentivizedPoolsResponse,
  ): JsonSafe<QueryIncentivizedPoolsResponse> {
    const obj: any = {};
    if (message.incentivizedPools) {
      obj.incentivizedPools = message.incentivizedPools.map(e =>
        e ? IncentivizedPool.toJSON(e) : undefined,
      );
    } else {
      obj.incentivizedPools = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryIncentivizedPoolsResponse>,
  ): QueryIncentivizedPoolsResponse {
    const message = createBaseQueryIncentivizedPoolsResponse();
    message.incentivizedPools =
      object.incentivizedPools?.map(e => IncentivizedPool.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryIncentivizedPoolsResponseProtoMsg,
  ): QueryIncentivizedPoolsResponse {
    return QueryIncentivizedPoolsResponse.decode(message.value);
  },
  toProto(message: QueryIncentivizedPoolsResponse): Uint8Array {
    return QueryIncentivizedPoolsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryIncentivizedPoolsResponse,
  ): QueryIncentivizedPoolsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.QueryIncentivizedPoolsResponse',
      value: QueryIncentivizedPoolsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryExternalIncentiveGaugesRequest(): QueryExternalIncentiveGaugesRequest {
  return {};
}
export const QueryExternalIncentiveGaugesRequest = {
  typeUrl:
    '/osmosis.poolincentives.v1beta1.QueryExternalIncentiveGaugesRequest',
  encode(
    _: QueryExternalIncentiveGaugesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryExternalIncentiveGaugesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryExternalIncentiveGaugesRequest();
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
  fromJSON(_: any): QueryExternalIncentiveGaugesRequest {
    return {};
  },
  toJSON(
    _: QueryExternalIncentiveGaugesRequest,
  ): JsonSafe<QueryExternalIncentiveGaugesRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryExternalIncentiveGaugesRequest>,
  ): QueryExternalIncentiveGaugesRequest {
    const message = createBaseQueryExternalIncentiveGaugesRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryExternalIncentiveGaugesRequestProtoMsg,
  ): QueryExternalIncentiveGaugesRequest {
    return QueryExternalIncentiveGaugesRequest.decode(message.value);
  },
  toProto(message: QueryExternalIncentiveGaugesRequest): Uint8Array {
    return QueryExternalIncentiveGaugesRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryExternalIncentiveGaugesRequest,
  ): QueryExternalIncentiveGaugesRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.poolincentives.v1beta1.QueryExternalIncentiveGaugesRequest',
      value: QueryExternalIncentiveGaugesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryExternalIncentiveGaugesResponse(): QueryExternalIncentiveGaugesResponse {
  return {
    data: [],
  };
}
export const QueryExternalIncentiveGaugesResponse = {
  typeUrl:
    '/osmosis.poolincentives.v1beta1.QueryExternalIncentiveGaugesResponse',
  encode(
    message: QueryExternalIncentiveGaugesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.data) {
      Gauge.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryExternalIncentiveGaugesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryExternalIncentiveGaugesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data.push(Gauge.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryExternalIncentiveGaugesResponse {
    return {
      data: Array.isArray(object?.data)
        ? object.data.map((e: any) => Gauge.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryExternalIncentiveGaugesResponse,
  ): JsonSafe<QueryExternalIncentiveGaugesResponse> {
    const obj: any = {};
    if (message.data) {
      obj.data = message.data.map(e => (e ? Gauge.toJSON(e) : undefined));
    } else {
      obj.data = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryExternalIncentiveGaugesResponse>,
  ): QueryExternalIncentiveGaugesResponse {
    const message = createBaseQueryExternalIncentiveGaugesResponse();
    message.data = object.data?.map(e => Gauge.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryExternalIncentiveGaugesResponseProtoMsg,
  ): QueryExternalIncentiveGaugesResponse {
    return QueryExternalIncentiveGaugesResponse.decode(message.value);
  },
  toProto(message: QueryExternalIncentiveGaugesResponse): Uint8Array {
    return QueryExternalIncentiveGaugesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryExternalIncentiveGaugesResponse,
  ): QueryExternalIncentiveGaugesResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.poolincentives.v1beta1.QueryExternalIncentiveGaugesResponse',
      value: QueryExternalIncentiveGaugesResponse.encode(message).finish(),
    };
  },
};
