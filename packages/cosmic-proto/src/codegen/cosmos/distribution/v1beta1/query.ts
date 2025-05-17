//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../base/query/v1beta1/pagination.js';
import {
  Params,
  type ParamsSDKType,
  ValidatorOutstandingRewards,
  type ValidatorOutstandingRewardsSDKType,
  ValidatorAccumulatedCommission,
  type ValidatorAccumulatedCommissionSDKType,
  ValidatorSlashEvent,
  type ValidatorSlashEventSDKType,
  DelegationDelegatorReward,
  type DelegationDelegatorRewardSDKType,
} from './distribution.js';
import { DecCoin, type DecCoinSDKType } from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/** QueryParamsRequest is the request type for the Query/Params RPC method. */
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryParamsRequest';
  value: Uint8Array;
}
/** QueryParamsRequest is the request type for the Query/Params RPC method. */
export interface QueryParamsRequestSDKType {}
/** QueryParamsResponse is the response type for the Query/Params RPC method. */
export interface QueryParamsResponse {
  /** params defines the parameters of the module. */
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryParamsResponse';
  value: Uint8Array;
}
/** QueryParamsResponse is the response type for the Query/Params RPC method. */
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
/**
 * QueryValidatorOutstandingRewardsRequest is the request type for the
 * Query/ValidatorOutstandingRewards RPC method.
 */
export interface QueryValidatorOutstandingRewardsRequest {
  /** validator_address defines the validator address to query for. */
  validatorAddress: string;
}
export interface QueryValidatorOutstandingRewardsRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest';
  value: Uint8Array;
}
/**
 * QueryValidatorOutstandingRewardsRequest is the request type for the
 * Query/ValidatorOutstandingRewards RPC method.
 */
export interface QueryValidatorOutstandingRewardsRequestSDKType {
  validator_address: string;
}
/**
 * QueryValidatorOutstandingRewardsResponse is the response type for the
 * Query/ValidatorOutstandingRewards RPC method.
 */
export interface QueryValidatorOutstandingRewardsResponse {
  rewards: ValidatorOutstandingRewards;
}
export interface QueryValidatorOutstandingRewardsResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse';
  value: Uint8Array;
}
/**
 * QueryValidatorOutstandingRewardsResponse is the response type for the
 * Query/ValidatorOutstandingRewards RPC method.
 */
export interface QueryValidatorOutstandingRewardsResponseSDKType {
  rewards: ValidatorOutstandingRewardsSDKType;
}
/**
 * QueryValidatorCommissionRequest is the request type for the
 * Query/ValidatorCommission RPC method
 */
export interface QueryValidatorCommissionRequest {
  /** validator_address defines the validator address to query for. */
  validatorAddress: string;
}
export interface QueryValidatorCommissionRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionRequest';
  value: Uint8Array;
}
/**
 * QueryValidatorCommissionRequest is the request type for the
 * Query/ValidatorCommission RPC method
 */
export interface QueryValidatorCommissionRequestSDKType {
  validator_address: string;
}
/**
 * QueryValidatorCommissionResponse is the response type for the
 * Query/ValidatorCommission RPC method
 */
export interface QueryValidatorCommissionResponse {
  /** commission defines the commision the validator received. */
  commission: ValidatorAccumulatedCommission;
}
export interface QueryValidatorCommissionResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionResponse';
  value: Uint8Array;
}
/**
 * QueryValidatorCommissionResponse is the response type for the
 * Query/ValidatorCommission RPC method
 */
export interface QueryValidatorCommissionResponseSDKType {
  commission: ValidatorAccumulatedCommissionSDKType;
}
/**
 * QueryValidatorSlashesRequest is the request type for the
 * Query/ValidatorSlashes RPC method
 */
export interface QueryValidatorSlashesRequest {
  /** validator_address defines the validator address to query for. */
  validatorAddress: string;
  /** starting_height defines the optional starting height to query the slashes. */
  startingHeight: bigint;
  /** starting_height defines the optional ending height to query the slashes. */
  endingHeight: bigint;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryValidatorSlashesRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesRequest';
  value: Uint8Array;
}
/**
 * QueryValidatorSlashesRequest is the request type for the
 * Query/ValidatorSlashes RPC method
 */
export interface QueryValidatorSlashesRequestSDKType {
  validator_address: string;
  starting_height: bigint;
  ending_height: bigint;
  pagination?: PageRequestSDKType;
}
/**
 * QueryValidatorSlashesResponse is the response type for the
 * Query/ValidatorSlashes RPC method.
 */
export interface QueryValidatorSlashesResponse {
  /** slashes defines the slashes the validator received. */
  slashes: ValidatorSlashEvent[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryValidatorSlashesResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesResponse';
  value: Uint8Array;
}
/**
 * QueryValidatorSlashesResponse is the response type for the
 * Query/ValidatorSlashes RPC method.
 */
export interface QueryValidatorSlashesResponseSDKType {
  slashes: ValidatorSlashEventSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryDelegationRewardsRequest is the request type for the
 * Query/DelegationRewards RPC method.
 */
export interface QueryDelegationRewardsRequest {
  /** delegator_address defines the delegator address to query for. */
  delegatorAddress: string;
  /** validator_address defines the validator address to query for. */
  validatorAddress: string;
}
export interface QueryDelegationRewardsRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsRequest';
  value: Uint8Array;
}
/**
 * QueryDelegationRewardsRequest is the request type for the
 * Query/DelegationRewards RPC method.
 */
export interface QueryDelegationRewardsRequestSDKType {
  delegator_address: string;
  validator_address: string;
}
/**
 * QueryDelegationRewardsResponse is the response type for the
 * Query/DelegationRewards RPC method.
 */
export interface QueryDelegationRewardsResponse {
  /** rewards defines the rewards accrued by a delegation. */
  rewards: DecCoin[];
}
export interface QueryDelegationRewardsResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsResponse';
  value: Uint8Array;
}
/**
 * QueryDelegationRewardsResponse is the response type for the
 * Query/DelegationRewards RPC method.
 */
export interface QueryDelegationRewardsResponseSDKType {
  rewards: DecCoinSDKType[];
}
/**
 * QueryDelegationTotalRewardsRequest is the request type for the
 * Query/DelegationTotalRewards RPC method.
 */
export interface QueryDelegationTotalRewardsRequest {
  /** delegator_address defines the delegator address to query for. */
  delegatorAddress: string;
}
export interface QueryDelegationTotalRewardsRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest';
  value: Uint8Array;
}
/**
 * QueryDelegationTotalRewardsRequest is the request type for the
 * Query/DelegationTotalRewards RPC method.
 */
export interface QueryDelegationTotalRewardsRequestSDKType {
  delegator_address: string;
}
/**
 * QueryDelegationTotalRewardsResponse is the response type for the
 * Query/DelegationTotalRewards RPC method.
 */
export interface QueryDelegationTotalRewardsResponse {
  /** rewards defines all the rewards accrued by a delegator. */
  rewards: DelegationDelegatorReward[];
  /** total defines the sum of all the rewards. */
  total: DecCoin[];
}
export interface QueryDelegationTotalRewardsResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse';
  value: Uint8Array;
}
/**
 * QueryDelegationTotalRewardsResponse is the response type for the
 * Query/DelegationTotalRewards RPC method.
 */
export interface QueryDelegationTotalRewardsResponseSDKType {
  rewards: DelegationDelegatorRewardSDKType[];
  total: DecCoinSDKType[];
}
/**
 * QueryDelegatorValidatorsRequest is the request type for the
 * Query/DelegatorValidators RPC method.
 */
export interface QueryDelegatorValidatorsRequest {
  /** delegator_address defines the delegator address to query for. */
  delegatorAddress: string;
}
export interface QueryDelegatorValidatorsRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest';
  value: Uint8Array;
}
/**
 * QueryDelegatorValidatorsRequest is the request type for the
 * Query/DelegatorValidators RPC method.
 */
export interface QueryDelegatorValidatorsRequestSDKType {
  delegator_address: string;
}
/**
 * QueryDelegatorValidatorsResponse is the response type for the
 * Query/DelegatorValidators RPC method.
 */
export interface QueryDelegatorValidatorsResponse {
  /** validators defines the validators a delegator is delegating for. */
  validators: string[];
}
export interface QueryDelegatorValidatorsResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse';
  value: Uint8Array;
}
/**
 * QueryDelegatorValidatorsResponse is the response type for the
 * Query/DelegatorValidators RPC method.
 */
export interface QueryDelegatorValidatorsResponseSDKType {
  validators: string[];
}
/**
 * QueryDelegatorWithdrawAddressRequest is the request type for the
 * Query/DelegatorWithdrawAddress RPC method.
 */
export interface QueryDelegatorWithdrawAddressRequest {
  /** delegator_address defines the delegator address to query for. */
  delegatorAddress: string;
}
export interface QueryDelegatorWithdrawAddressRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest';
  value: Uint8Array;
}
/**
 * QueryDelegatorWithdrawAddressRequest is the request type for the
 * Query/DelegatorWithdrawAddress RPC method.
 */
export interface QueryDelegatorWithdrawAddressRequestSDKType {
  delegator_address: string;
}
/**
 * QueryDelegatorWithdrawAddressResponse is the response type for the
 * Query/DelegatorWithdrawAddress RPC method.
 */
export interface QueryDelegatorWithdrawAddressResponse {
  /** withdraw_address defines the delegator address to query for. */
  withdrawAddress: string;
}
export interface QueryDelegatorWithdrawAddressResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse';
  value: Uint8Array;
}
/**
 * QueryDelegatorWithdrawAddressResponse is the response type for the
 * Query/DelegatorWithdrawAddress RPC method.
 */
export interface QueryDelegatorWithdrawAddressResponseSDKType {
  withdraw_address: string;
}
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 */
export interface QueryCommunityPoolRequest {}
export interface QueryCommunityPoolRequestProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolRequest';
  value: Uint8Array;
}
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 */
export interface QueryCommunityPoolRequestSDKType {}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 */
export interface QueryCommunityPoolResponse {
  /** pool defines community pool's coins. */
  pool: DecCoin[];
}
export interface QueryCommunityPoolResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolResponse';
  value: Uint8Array;
}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 */
export interface QueryCommunityPoolResponseSDKType {
  pool: DecCoinSDKType[];
}
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
export const QueryParamsRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryParamsRequest',
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
      typeUrl: '/cosmos.distribution.v1beta1.QueryParamsRequest',
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
  typeUrl: '/cosmos.distribution.v1beta1.QueryParamsResponse',
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
      typeUrl: '/cosmos.distribution.v1beta1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryValidatorOutstandingRewardsRequest(): QueryValidatorOutstandingRewardsRequest {
  return {
    validatorAddress: '',
  };
}
export const QueryValidatorOutstandingRewardsRequest = {
  typeUrl:
    '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest',
  encode(
    message: QueryValidatorOutstandingRewardsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryValidatorOutstandingRewardsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryValidatorOutstandingRewardsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryValidatorOutstandingRewardsRequest {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryValidatorOutstandingRewardsRequest,
  ): JsonSafe<QueryValidatorOutstandingRewardsRequest> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryValidatorOutstandingRewardsRequest>,
  ): QueryValidatorOutstandingRewardsRequest {
    const message = createBaseQueryValidatorOutstandingRewardsRequest();
    message.validatorAddress = object.validatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryValidatorOutstandingRewardsRequestProtoMsg,
  ): QueryValidatorOutstandingRewardsRequest {
    return QueryValidatorOutstandingRewardsRequest.decode(message.value);
  },
  toProto(message: QueryValidatorOutstandingRewardsRequest): Uint8Array {
    return QueryValidatorOutstandingRewardsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryValidatorOutstandingRewardsRequest,
  ): QueryValidatorOutstandingRewardsRequestProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest',
      value: QueryValidatorOutstandingRewardsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryValidatorOutstandingRewardsResponse(): QueryValidatorOutstandingRewardsResponse {
  return {
    rewards: ValidatorOutstandingRewards.fromPartial({}),
  };
}
export const QueryValidatorOutstandingRewardsResponse = {
  typeUrl:
    '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse',
  encode(
    message: QueryValidatorOutstandingRewardsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.rewards !== undefined) {
      ValidatorOutstandingRewards.encode(
        message.rewards,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryValidatorOutstandingRewardsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryValidatorOutstandingRewardsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.rewards = ValidatorOutstandingRewards.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryValidatorOutstandingRewardsResponse {
    return {
      rewards: isSet(object.rewards)
        ? ValidatorOutstandingRewards.fromJSON(object.rewards)
        : undefined,
    };
  },
  toJSON(
    message: QueryValidatorOutstandingRewardsResponse,
  ): JsonSafe<QueryValidatorOutstandingRewardsResponse> {
    const obj: any = {};
    message.rewards !== undefined &&
      (obj.rewards = message.rewards
        ? ValidatorOutstandingRewards.toJSON(message.rewards)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryValidatorOutstandingRewardsResponse>,
  ): QueryValidatorOutstandingRewardsResponse {
    const message = createBaseQueryValidatorOutstandingRewardsResponse();
    message.rewards =
      object.rewards !== undefined && object.rewards !== null
        ? ValidatorOutstandingRewards.fromPartial(object.rewards)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryValidatorOutstandingRewardsResponseProtoMsg,
  ): QueryValidatorOutstandingRewardsResponse {
    return QueryValidatorOutstandingRewardsResponse.decode(message.value);
  },
  toProto(message: QueryValidatorOutstandingRewardsResponse): Uint8Array {
    return QueryValidatorOutstandingRewardsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryValidatorOutstandingRewardsResponse,
  ): QueryValidatorOutstandingRewardsResponseProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse',
      value: QueryValidatorOutstandingRewardsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryValidatorCommissionRequest(): QueryValidatorCommissionRequest {
  return {
    validatorAddress: '',
  };
}
export const QueryValidatorCommissionRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionRequest',
  encode(
    message: QueryValidatorCommissionRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryValidatorCommissionRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryValidatorCommissionRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryValidatorCommissionRequest {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryValidatorCommissionRequest,
  ): JsonSafe<QueryValidatorCommissionRequest> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryValidatorCommissionRequest>,
  ): QueryValidatorCommissionRequest {
    const message = createBaseQueryValidatorCommissionRequest();
    message.validatorAddress = object.validatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryValidatorCommissionRequestProtoMsg,
  ): QueryValidatorCommissionRequest {
    return QueryValidatorCommissionRequest.decode(message.value);
  },
  toProto(message: QueryValidatorCommissionRequest): Uint8Array {
    return QueryValidatorCommissionRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryValidatorCommissionRequest,
  ): QueryValidatorCommissionRequestProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionRequest',
      value: QueryValidatorCommissionRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryValidatorCommissionResponse(): QueryValidatorCommissionResponse {
  return {
    commission: ValidatorAccumulatedCommission.fromPartial({}),
  };
}
export const QueryValidatorCommissionResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionResponse',
  encode(
    message: QueryValidatorCommissionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.commission !== undefined) {
      ValidatorAccumulatedCommission.encode(
        message.commission,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryValidatorCommissionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryValidatorCommissionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.commission = ValidatorAccumulatedCommission.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryValidatorCommissionResponse {
    return {
      commission: isSet(object.commission)
        ? ValidatorAccumulatedCommission.fromJSON(object.commission)
        : undefined,
    };
  },
  toJSON(
    message: QueryValidatorCommissionResponse,
  ): JsonSafe<QueryValidatorCommissionResponse> {
    const obj: any = {};
    message.commission !== undefined &&
      (obj.commission = message.commission
        ? ValidatorAccumulatedCommission.toJSON(message.commission)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryValidatorCommissionResponse>,
  ): QueryValidatorCommissionResponse {
    const message = createBaseQueryValidatorCommissionResponse();
    message.commission =
      object.commission !== undefined && object.commission !== null
        ? ValidatorAccumulatedCommission.fromPartial(object.commission)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryValidatorCommissionResponseProtoMsg,
  ): QueryValidatorCommissionResponse {
    return QueryValidatorCommissionResponse.decode(message.value);
  },
  toProto(message: QueryValidatorCommissionResponse): Uint8Array {
    return QueryValidatorCommissionResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryValidatorCommissionResponse,
  ): QueryValidatorCommissionResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionResponse',
      value: QueryValidatorCommissionResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryValidatorSlashesRequest(): QueryValidatorSlashesRequest {
  return {
    validatorAddress: '',
    startingHeight: BigInt(0),
    endingHeight: BigInt(0),
    pagination: undefined,
  };
}
export const QueryValidatorSlashesRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesRequest',
  encode(
    message: QueryValidatorSlashesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    if (message.startingHeight !== BigInt(0)) {
      writer.uint32(16).uint64(message.startingHeight);
    }
    if (message.endingHeight !== BigInt(0)) {
      writer.uint32(24).uint64(message.endingHeight);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryValidatorSlashesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryValidatorSlashesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        case 2:
          message.startingHeight = reader.uint64();
          break;
        case 3:
          message.endingHeight = reader.uint64();
          break;
        case 4:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryValidatorSlashesRequest {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      startingHeight: isSet(object.startingHeight)
        ? BigInt(object.startingHeight.toString())
        : BigInt(0),
      endingHeight: isSet(object.endingHeight)
        ? BigInt(object.endingHeight.toString())
        : BigInt(0),
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryValidatorSlashesRequest,
  ): JsonSafe<QueryValidatorSlashesRequest> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    message.startingHeight !== undefined &&
      (obj.startingHeight = (message.startingHeight || BigInt(0)).toString());
    message.endingHeight !== undefined &&
      (obj.endingHeight = (message.endingHeight || BigInt(0)).toString());
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryValidatorSlashesRequest>,
  ): QueryValidatorSlashesRequest {
    const message = createBaseQueryValidatorSlashesRequest();
    message.validatorAddress = object.validatorAddress ?? '';
    message.startingHeight =
      object.startingHeight !== undefined && object.startingHeight !== null
        ? BigInt(object.startingHeight.toString())
        : BigInt(0);
    message.endingHeight =
      object.endingHeight !== undefined && object.endingHeight !== null
        ? BigInt(object.endingHeight.toString())
        : BigInt(0);
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryValidatorSlashesRequestProtoMsg,
  ): QueryValidatorSlashesRequest {
    return QueryValidatorSlashesRequest.decode(message.value);
  },
  toProto(message: QueryValidatorSlashesRequest): Uint8Array {
    return QueryValidatorSlashesRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryValidatorSlashesRequest,
  ): QueryValidatorSlashesRequestProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesRequest',
      value: QueryValidatorSlashesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryValidatorSlashesResponse(): QueryValidatorSlashesResponse {
  return {
    slashes: [],
    pagination: undefined,
  };
}
export const QueryValidatorSlashesResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesResponse',
  encode(
    message: QueryValidatorSlashesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.slashes) {
      ValidatorSlashEvent.encode(v!, writer.uint32(10).fork()).ldelim();
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
  ): QueryValidatorSlashesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryValidatorSlashesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.slashes.push(
            ValidatorSlashEvent.decode(reader, reader.uint32()),
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
  fromJSON(object: any): QueryValidatorSlashesResponse {
    return {
      slashes: Array.isArray(object?.slashes)
        ? object.slashes.map((e: any) => ValidatorSlashEvent.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryValidatorSlashesResponse,
  ): JsonSafe<QueryValidatorSlashesResponse> {
    const obj: any = {};
    if (message.slashes) {
      obj.slashes = message.slashes.map(e =>
        e ? ValidatorSlashEvent.toJSON(e) : undefined,
      );
    } else {
      obj.slashes = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryValidatorSlashesResponse>,
  ): QueryValidatorSlashesResponse {
    const message = createBaseQueryValidatorSlashesResponse();
    message.slashes =
      object.slashes?.map(e => ValidatorSlashEvent.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryValidatorSlashesResponseProtoMsg,
  ): QueryValidatorSlashesResponse {
    return QueryValidatorSlashesResponse.decode(message.value);
  },
  toProto(message: QueryValidatorSlashesResponse): Uint8Array {
    return QueryValidatorSlashesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryValidatorSlashesResponse,
  ): QueryValidatorSlashesResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesResponse',
      value: QueryValidatorSlashesResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegationRewardsRequest(): QueryDelegationRewardsRequest {
  return {
    delegatorAddress: '',
    validatorAddress: '',
  };
}
export const QueryDelegationRewardsRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsRequest',
  encode(
    message: QueryDelegationRewardsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    if (message.validatorAddress !== '') {
      writer.uint32(18).string(message.validatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegationRewardsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegationRewardsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        case 2:
          message.validatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegationRewardsRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryDelegationRewardsRequest,
  ): JsonSafe<QueryDelegationRewardsRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegationRewardsRequest>,
  ): QueryDelegationRewardsRequest {
    const message = createBaseQueryDelegationRewardsRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    message.validatorAddress = object.validatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDelegationRewardsRequestProtoMsg,
  ): QueryDelegationRewardsRequest {
    return QueryDelegationRewardsRequest.decode(message.value);
  },
  toProto(message: QueryDelegationRewardsRequest): Uint8Array {
    return QueryDelegationRewardsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegationRewardsRequest,
  ): QueryDelegationRewardsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsRequest',
      value: QueryDelegationRewardsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegationRewardsResponse(): QueryDelegationRewardsResponse {
  return {
    rewards: [],
  };
}
export const QueryDelegationRewardsResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsResponse',
  encode(
    message: QueryDelegationRewardsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.rewards) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegationRewardsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegationRewardsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.rewards.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegationRewardsResponse {
    return {
      rewards: Array.isArray(object?.rewards)
        ? object.rewards.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryDelegationRewardsResponse,
  ): JsonSafe<QueryDelegationRewardsResponse> {
    const obj: any = {};
    if (message.rewards) {
      obj.rewards = message.rewards.map(e =>
        e ? DecCoin.toJSON(e) : undefined,
      );
    } else {
      obj.rewards = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegationRewardsResponse>,
  ): QueryDelegationRewardsResponse {
    const message = createBaseQueryDelegationRewardsResponse();
    message.rewards = object.rewards?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryDelegationRewardsResponseProtoMsg,
  ): QueryDelegationRewardsResponse {
    return QueryDelegationRewardsResponse.decode(message.value);
  },
  toProto(message: QueryDelegationRewardsResponse): Uint8Array {
    return QueryDelegationRewardsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegationRewardsResponse,
  ): QueryDelegationRewardsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsResponse',
      value: QueryDelegationRewardsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegationTotalRewardsRequest(): QueryDelegationTotalRewardsRequest {
  return {
    delegatorAddress: '',
  };
}
export const QueryDelegationTotalRewardsRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest',
  encode(
    message: QueryDelegationTotalRewardsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegationTotalRewardsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegationTotalRewardsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegationTotalRewardsRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryDelegationTotalRewardsRequest,
  ): JsonSafe<QueryDelegationTotalRewardsRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegationTotalRewardsRequest>,
  ): QueryDelegationTotalRewardsRequest {
    const message = createBaseQueryDelegationTotalRewardsRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDelegationTotalRewardsRequestProtoMsg,
  ): QueryDelegationTotalRewardsRequest {
    return QueryDelegationTotalRewardsRequest.decode(message.value);
  },
  toProto(message: QueryDelegationTotalRewardsRequest): Uint8Array {
    return QueryDelegationTotalRewardsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegationTotalRewardsRequest,
  ): QueryDelegationTotalRewardsRequestProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest',
      value: QueryDelegationTotalRewardsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegationTotalRewardsResponse(): QueryDelegationTotalRewardsResponse {
  return {
    rewards: [],
    total: [],
  };
}
export const QueryDelegationTotalRewardsResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse',
  encode(
    message: QueryDelegationTotalRewardsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.rewards) {
      DelegationDelegatorReward.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.total) {
      DecCoin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegationTotalRewardsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegationTotalRewardsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.rewards.push(
            DelegationDelegatorReward.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.total.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegationTotalRewardsResponse {
    return {
      rewards: Array.isArray(object?.rewards)
        ? object.rewards.map((e: any) => DelegationDelegatorReward.fromJSON(e))
        : [],
      total: Array.isArray(object?.total)
        ? object.total.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryDelegationTotalRewardsResponse,
  ): JsonSafe<QueryDelegationTotalRewardsResponse> {
    const obj: any = {};
    if (message.rewards) {
      obj.rewards = message.rewards.map(e =>
        e ? DelegationDelegatorReward.toJSON(e) : undefined,
      );
    } else {
      obj.rewards = [];
    }
    if (message.total) {
      obj.total = message.total.map(e => (e ? DecCoin.toJSON(e) : undefined));
    } else {
      obj.total = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegationTotalRewardsResponse>,
  ): QueryDelegationTotalRewardsResponse {
    const message = createBaseQueryDelegationTotalRewardsResponse();
    message.rewards =
      object.rewards?.map(e => DelegationDelegatorReward.fromPartial(e)) || [];
    message.total = object.total?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryDelegationTotalRewardsResponseProtoMsg,
  ): QueryDelegationTotalRewardsResponse {
    return QueryDelegationTotalRewardsResponse.decode(message.value);
  },
  toProto(message: QueryDelegationTotalRewardsResponse): Uint8Array {
    return QueryDelegationTotalRewardsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegationTotalRewardsResponse,
  ): QueryDelegationTotalRewardsResponseProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse',
      value: QueryDelegationTotalRewardsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegatorValidatorsRequest(): QueryDelegatorValidatorsRequest {
  return {
    delegatorAddress: '',
  };
}
export const QueryDelegatorValidatorsRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest',
  encode(
    message: QueryDelegatorValidatorsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegatorValidatorsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegatorValidatorsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegatorValidatorsRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryDelegatorValidatorsRequest,
  ): JsonSafe<QueryDelegatorValidatorsRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegatorValidatorsRequest>,
  ): QueryDelegatorValidatorsRequest {
    const message = createBaseQueryDelegatorValidatorsRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDelegatorValidatorsRequestProtoMsg,
  ): QueryDelegatorValidatorsRequest {
    return QueryDelegatorValidatorsRequest.decode(message.value);
  },
  toProto(message: QueryDelegatorValidatorsRequest): Uint8Array {
    return QueryDelegatorValidatorsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegatorValidatorsRequest,
  ): QueryDelegatorValidatorsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest',
      value: QueryDelegatorValidatorsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegatorValidatorsResponse(): QueryDelegatorValidatorsResponse {
  return {
    validators: [],
  };
}
export const QueryDelegatorValidatorsResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse',
  encode(
    message: QueryDelegatorValidatorsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.validators) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegatorValidatorsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegatorValidatorsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validators.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegatorValidatorsResponse {
    return {
      validators: Array.isArray(object?.validators)
        ? object.validators.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(
    message: QueryDelegatorValidatorsResponse,
  ): JsonSafe<QueryDelegatorValidatorsResponse> {
    const obj: any = {};
    if (message.validators) {
      obj.validators = message.validators.map(e => e);
    } else {
      obj.validators = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegatorValidatorsResponse>,
  ): QueryDelegatorValidatorsResponse {
    const message = createBaseQueryDelegatorValidatorsResponse();
    message.validators = object.validators?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryDelegatorValidatorsResponseProtoMsg,
  ): QueryDelegatorValidatorsResponse {
    return QueryDelegatorValidatorsResponse.decode(message.value);
  },
  toProto(message: QueryDelegatorValidatorsResponse): Uint8Array {
    return QueryDelegatorValidatorsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegatorValidatorsResponse,
  ): QueryDelegatorValidatorsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse',
      value: QueryDelegatorValidatorsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegatorWithdrawAddressRequest(): QueryDelegatorWithdrawAddressRequest {
  return {
    delegatorAddress: '',
  };
}
export const QueryDelegatorWithdrawAddressRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest',
  encode(
    message: QueryDelegatorWithdrawAddressRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegatorWithdrawAddressRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegatorWithdrawAddressRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegatorWithdrawAddressRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryDelegatorWithdrawAddressRequest,
  ): JsonSafe<QueryDelegatorWithdrawAddressRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegatorWithdrawAddressRequest>,
  ): QueryDelegatorWithdrawAddressRequest {
    const message = createBaseQueryDelegatorWithdrawAddressRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDelegatorWithdrawAddressRequestProtoMsg,
  ): QueryDelegatorWithdrawAddressRequest {
    return QueryDelegatorWithdrawAddressRequest.decode(message.value);
  },
  toProto(message: QueryDelegatorWithdrawAddressRequest): Uint8Array {
    return QueryDelegatorWithdrawAddressRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegatorWithdrawAddressRequest,
  ): QueryDelegatorWithdrawAddressRequestProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest',
      value: QueryDelegatorWithdrawAddressRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDelegatorWithdrawAddressResponse(): QueryDelegatorWithdrawAddressResponse {
  return {
    withdrawAddress: '',
  };
}
export const QueryDelegatorWithdrawAddressResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse',
  encode(
    message: QueryDelegatorWithdrawAddressResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.withdrawAddress !== '') {
      writer.uint32(10).string(message.withdrawAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDelegatorWithdrawAddressResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDelegatorWithdrawAddressResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.withdrawAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDelegatorWithdrawAddressResponse {
    return {
      withdrawAddress: isSet(object.withdrawAddress)
        ? String(object.withdrawAddress)
        : '',
    };
  },
  toJSON(
    message: QueryDelegatorWithdrawAddressResponse,
  ): JsonSafe<QueryDelegatorWithdrawAddressResponse> {
    const obj: any = {};
    message.withdrawAddress !== undefined &&
      (obj.withdrawAddress = message.withdrawAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDelegatorWithdrawAddressResponse>,
  ): QueryDelegatorWithdrawAddressResponse {
    const message = createBaseQueryDelegatorWithdrawAddressResponse();
    message.withdrawAddress = object.withdrawAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDelegatorWithdrawAddressResponseProtoMsg,
  ): QueryDelegatorWithdrawAddressResponse {
    return QueryDelegatorWithdrawAddressResponse.decode(message.value);
  },
  toProto(message: QueryDelegatorWithdrawAddressResponse): Uint8Array {
    return QueryDelegatorWithdrawAddressResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDelegatorWithdrawAddressResponse,
  ): QueryDelegatorWithdrawAddressResponseProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse',
      value: QueryDelegatorWithdrawAddressResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryCommunityPoolRequest(): QueryCommunityPoolRequest {
  return {};
}
export const QueryCommunityPoolRequest = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolRequest',
  encode(
    _: QueryCommunityPoolRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCommunityPoolRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCommunityPoolRequest();
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
  fromJSON(_: any): QueryCommunityPoolRequest {
    return {};
  },
  toJSON(_: QueryCommunityPoolRequest): JsonSafe<QueryCommunityPoolRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryCommunityPoolRequest>,
  ): QueryCommunityPoolRequest {
    const message = createBaseQueryCommunityPoolRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryCommunityPoolRequestProtoMsg,
  ): QueryCommunityPoolRequest {
    return QueryCommunityPoolRequest.decode(message.value);
  },
  toProto(message: QueryCommunityPoolRequest): Uint8Array {
    return QueryCommunityPoolRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCommunityPoolRequest,
  ): QueryCommunityPoolRequestProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolRequest',
      value: QueryCommunityPoolRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryCommunityPoolResponse(): QueryCommunityPoolResponse {
  return {
    pool: [],
  };
}
export const QueryCommunityPoolResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolResponse',
  encode(
    message: QueryCommunityPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.pool) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCommunityPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCommunityPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pool.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCommunityPoolResponse {
    return {
      pool: Array.isArray(object?.pool)
        ? object.pool.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryCommunityPoolResponse,
  ): JsonSafe<QueryCommunityPoolResponse> {
    const obj: any = {};
    if (message.pool) {
      obj.pool = message.pool.map(e => (e ? DecCoin.toJSON(e) : undefined));
    } else {
      obj.pool = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryCommunityPoolResponse>,
  ): QueryCommunityPoolResponse {
    const message = createBaseQueryCommunityPoolResponse();
    message.pool = object.pool?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryCommunityPoolResponseProtoMsg,
  ): QueryCommunityPoolResponse {
    return QueryCommunityPoolResponse.decode(message.value);
  },
  toProto(message: QueryCommunityPoolResponse): Uint8Array {
    return QueryCommunityPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCommunityPoolResponse,
  ): QueryCommunityPoolResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolResponse',
      value: QueryCommunityPoolResponse.encode(message).finish(),
    };
  },
};
