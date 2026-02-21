import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { Params, type ParamsSDKType, ValidatorOutstandingRewards, type ValidatorOutstandingRewardsSDKType, ValidatorAccumulatedCommission, type ValidatorAccumulatedCommissionSDKType, ValidatorSlashEvent, type ValidatorSlashEventSDKType, DelegationDelegatorReward, type DelegationDelegatorRewardSDKType } from './distribution.js';
import { DecCoin, type DecCoinSDKType } from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryValidatorDistributionInfoRequest is the request type for the Query/ValidatorDistributionInfo RPC method.
 * @name QueryValidatorDistributionInfoRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorDistributionInfoRequest
 */
export interface QueryValidatorDistributionInfoRequest {
    /**
     * validator_address defines the validator address to query for.
     */
    validatorAddress: string;
}
export interface QueryValidatorDistributionInfoRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorDistributionInfoRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorDistributionInfoRequest is the request type for the Query/ValidatorDistributionInfo RPC method.
 * @name QueryValidatorDistributionInfoRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorDistributionInfoRequest
 */
export interface QueryValidatorDistributionInfoRequestSDKType {
    validator_address: string;
}
/**
 * QueryValidatorDistributionInfoResponse is the response type for the Query/ValidatorDistributionInfo RPC method.
 * @name QueryValidatorDistributionInfoResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorDistributionInfoResponse
 */
export interface QueryValidatorDistributionInfoResponse {
    /**
     * operator_address defines the validator operator address.
     */
    operatorAddress: string;
    /**
     * self_bond_rewards defines the self delegations rewards.
     */
    selfBondRewards: DecCoin[];
    /**
     * commission defines the commission the validator received.
     */
    commission: DecCoin[];
}
export interface QueryValidatorDistributionInfoResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorDistributionInfoResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorDistributionInfoResponse is the response type for the Query/ValidatorDistributionInfo RPC method.
 * @name QueryValidatorDistributionInfoResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorDistributionInfoResponse
 */
export interface QueryValidatorDistributionInfoResponseSDKType {
    operator_address: string;
    self_bond_rewards: DecCoinSDKType[];
    commission: DecCoinSDKType[];
}
/**
 * QueryValidatorOutstandingRewardsRequest is the request type for the
 * Query/ValidatorOutstandingRewards RPC method.
 * @name QueryValidatorOutstandingRewardsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest
 */
export interface QueryValidatorOutstandingRewardsRequest {
    /**
     * validator_address defines the validator address to query for.
     */
    validatorAddress: string;
}
export interface QueryValidatorOutstandingRewardsRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorOutstandingRewardsRequest is the request type for the
 * Query/ValidatorOutstandingRewards RPC method.
 * @name QueryValidatorOutstandingRewardsRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest
 */
export interface QueryValidatorOutstandingRewardsRequestSDKType {
    validator_address: string;
}
/**
 * QueryValidatorOutstandingRewardsResponse is the response type for the
 * Query/ValidatorOutstandingRewards RPC method.
 * @name QueryValidatorOutstandingRewardsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse
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
 * @name QueryValidatorOutstandingRewardsResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse
 */
export interface QueryValidatorOutstandingRewardsResponseSDKType {
    rewards: ValidatorOutstandingRewardsSDKType;
}
/**
 * QueryValidatorCommissionRequest is the request type for the
 * Query/ValidatorCommission RPC method
 * @name QueryValidatorCommissionRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorCommissionRequest
 */
export interface QueryValidatorCommissionRequest {
    /**
     * validator_address defines the validator address to query for.
     */
    validatorAddress: string;
}
export interface QueryValidatorCommissionRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorCommissionRequest is the request type for the
 * Query/ValidatorCommission RPC method
 * @name QueryValidatorCommissionRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorCommissionRequest
 */
export interface QueryValidatorCommissionRequestSDKType {
    validator_address: string;
}
/**
 * QueryValidatorCommissionResponse is the response type for the
 * Query/ValidatorCommission RPC method
 * @name QueryValidatorCommissionResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorCommissionResponse
 */
export interface QueryValidatorCommissionResponse {
    /**
     * commission defines the commission the validator received.
     */
    commission: ValidatorAccumulatedCommission;
}
export interface QueryValidatorCommissionResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorCommissionResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorCommissionResponse is the response type for the
 * Query/ValidatorCommission RPC method
 * @name QueryValidatorCommissionResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorCommissionResponse
 */
export interface QueryValidatorCommissionResponseSDKType {
    commission: ValidatorAccumulatedCommissionSDKType;
}
/**
 * QueryValidatorSlashesRequest is the request type for the
 * Query/ValidatorSlashes RPC method
 * @name QueryValidatorSlashesRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorSlashesRequest
 */
export interface QueryValidatorSlashesRequest {
    /**
     * validator_address defines the validator address to query for.
     */
    validatorAddress: string;
    /**
     * starting_height defines the optional starting height to query the slashes.
     */
    startingHeight: bigint;
    /**
     * starting_height defines the optional ending height to query the slashes.
     */
    endingHeight: bigint;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryValidatorSlashesRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorSlashesRequest is the request type for the
 * Query/ValidatorSlashes RPC method
 * @name QueryValidatorSlashesRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorSlashesRequest
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
 * @name QueryValidatorSlashesResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorSlashesResponse
 */
export interface QueryValidatorSlashesResponse {
    /**
     * slashes defines the slashes the validator received.
     */
    slashes: ValidatorSlashEvent[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryValidatorSlashesResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryValidatorSlashesResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorSlashesResponse is the response type for the
 * Query/ValidatorSlashes RPC method.
 * @name QueryValidatorSlashesResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorSlashesResponse
 */
export interface QueryValidatorSlashesResponseSDKType {
    slashes: ValidatorSlashEventSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDelegationRewardsRequest is the request type for the
 * Query/DelegationRewards RPC method.
 * @name QueryDelegationRewardsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationRewardsRequest
 */
export interface QueryDelegationRewardsRequest {
    /**
     * delegator_address defines the delegator address to query for.
     */
    delegatorAddress: string;
    /**
     * validator_address defines the validator address to query for.
     */
    validatorAddress: string;
}
export interface QueryDelegationRewardsRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsRequest';
    value: Uint8Array;
}
/**
 * QueryDelegationRewardsRequest is the request type for the
 * Query/DelegationRewards RPC method.
 * @name QueryDelegationRewardsRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationRewardsRequest
 */
export interface QueryDelegationRewardsRequestSDKType {
    delegator_address: string;
    validator_address: string;
}
/**
 * QueryDelegationRewardsResponse is the response type for the
 * Query/DelegationRewards RPC method.
 * @name QueryDelegationRewardsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationRewardsResponse
 */
export interface QueryDelegationRewardsResponse {
    /**
     * rewards defines the rewards accrued by a delegation.
     */
    rewards: DecCoin[];
}
export interface QueryDelegationRewardsResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationRewardsResponse';
    value: Uint8Array;
}
/**
 * QueryDelegationRewardsResponse is the response type for the
 * Query/DelegationRewards RPC method.
 * @name QueryDelegationRewardsResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationRewardsResponse
 */
export interface QueryDelegationRewardsResponseSDKType {
    rewards: DecCoinSDKType[];
}
/**
 * QueryDelegationTotalRewardsRequest is the request type for the
 * Query/DelegationTotalRewards RPC method.
 * @name QueryDelegationTotalRewardsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest
 */
export interface QueryDelegationTotalRewardsRequest {
    /**
     * delegator_address defines the delegator address to query for.
     */
    delegatorAddress: string;
}
export interface QueryDelegationTotalRewardsRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest';
    value: Uint8Array;
}
/**
 * QueryDelegationTotalRewardsRequest is the request type for the
 * Query/DelegationTotalRewards RPC method.
 * @name QueryDelegationTotalRewardsRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest
 */
export interface QueryDelegationTotalRewardsRequestSDKType {
    delegator_address: string;
}
/**
 * QueryDelegationTotalRewardsResponse is the response type for the
 * Query/DelegationTotalRewards RPC method.
 * @name QueryDelegationTotalRewardsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse
 */
export interface QueryDelegationTotalRewardsResponse {
    /**
     * rewards defines all the rewards accrued by a delegator.
     */
    rewards: DelegationDelegatorReward[];
    /**
     * total defines the sum of all the rewards.
     */
    total: DecCoin[];
}
export interface QueryDelegationTotalRewardsResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse';
    value: Uint8Array;
}
/**
 * QueryDelegationTotalRewardsResponse is the response type for the
 * Query/DelegationTotalRewards RPC method.
 * @name QueryDelegationTotalRewardsResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse
 */
export interface QueryDelegationTotalRewardsResponseSDKType {
    rewards: DelegationDelegatorRewardSDKType[];
    total: DecCoinSDKType[];
}
/**
 * QueryDelegatorValidatorsRequest is the request type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest
 */
export interface QueryDelegatorValidatorsRequest {
    /**
     * delegator_address defines the delegator address to query for.
     */
    delegatorAddress: string;
}
export interface QueryDelegatorValidatorsRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest';
    value: Uint8Array;
}
/**
 * QueryDelegatorValidatorsRequest is the request type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest
 */
export interface QueryDelegatorValidatorsRequestSDKType {
    delegator_address: string;
}
/**
 * QueryDelegatorValidatorsResponse is the response type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse
 */
export interface QueryDelegatorValidatorsResponse {
    /**
     * validators defines the validators a delegator is delegating for.
     */
    validators: string[];
}
export interface QueryDelegatorValidatorsResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse';
    value: Uint8Array;
}
/**
 * QueryDelegatorValidatorsResponse is the response type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse
 */
export interface QueryDelegatorValidatorsResponseSDKType {
    validators: string[];
}
/**
 * QueryDelegatorWithdrawAddressRequest is the request type for the
 * Query/DelegatorWithdrawAddress RPC method.
 * @name QueryDelegatorWithdrawAddressRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest
 */
export interface QueryDelegatorWithdrawAddressRequest {
    /**
     * delegator_address defines the delegator address to query for.
     */
    delegatorAddress: string;
}
export interface QueryDelegatorWithdrawAddressRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest';
    value: Uint8Array;
}
/**
 * QueryDelegatorWithdrawAddressRequest is the request type for the
 * Query/DelegatorWithdrawAddress RPC method.
 * @name QueryDelegatorWithdrawAddressRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest
 */
export interface QueryDelegatorWithdrawAddressRequestSDKType {
    delegator_address: string;
}
/**
 * QueryDelegatorWithdrawAddressResponse is the response type for the
 * Query/DelegatorWithdrawAddress RPC method.
 * @name QueryDelegatorWithdrawAddressResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse
 */
export interface QueryDelegatorWithdrawAddressResponse {
    /**
     * withdraw_address defines the delegator address to query for.
     */
    withdrawAddress: string;
}
export interface QueryDelegatorWithdrawAddressResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse';
    value: Uint8Array;
}
/**
 * QueryDelegatorWithdrawAddressResponse is the response type for the
 * Query/DelegatorWithdrawAddress RPC method.
 * @name QueryDelegatorWithdrawAddressResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse
 */
export interface QueryDelegatorWithdrawAddressResponseSDKType {
    withdraw_address: string;
}
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 * @name QueryCommunityPoolRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryCommunityPoolRequest
 */
export interface QueryCommunityPoolRequest {
}
export interface QueryCommunityPoolRequestProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolRequest';
    value: Uint8Array;
}
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 * @name QueryCommunityPoolRequestSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryCommunityPoolRequest
 */
export interface QueryCommunityPoolRequestSDKType {
}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 * @name QueryCommunityPoolResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryCommunityPoolResponse
 */
export interface QueryCommunityPoolResponse {
    /**
     * pool defines community pool's coins.
     */
    pool: DecCoin[];
}
export interface QueryCommunityPoolResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.QueryCommunityPoolResponse';
    value: Uint8Array;
}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 * @name QueryCommunityPoolResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryCommunityPoolResponse
 */
export interface QueryCommunityPoolResponseSDKType {
    pool: DecCoinSDKType[];
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryParamsRequest";
    aminoType: "cosmos-sdk/QueryParamsRequest";
    is(o: any): o is QueryParamsRequest;
    isSDK(o: any): o is QueryParamsRequestSDKType;
    encode(_: QueryParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsRequest;
    fromJSON(_: any): QueryParamsRequest;
    toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest>;
    fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest;
    fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest;
    toProto(message: QueryParamsRequest): Uint8Array;
    toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryParamsResponse";
    aminoType: "cosmos-sdk/QueryParamsResponse";
    is(o: any): o is QueryParamsResponse;
    isSDK(o: any): o is QueryParamsResponseSDKType;
    encode(message: QueryParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsResponse;
    fromJSON(object: any): QueryParamsResponse;
    toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse>;
    fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse;
    fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse;
    toProto(message: QueryParamsResponse): Uint8Array;
    toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorDistributionInfoRequest is the request type for the Query/ValidatorDistributionInfo RPC method.
 * @name QueryValidatorDistributionInfoRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorDistributionInfoRequest
 */
export declare const QueryValidatorDistributionInfoRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorDistributionInfoRequest";
    aminoType: "cosmos-sdk/QueryValidatorDistributionInfoRequest";
    is(o: any): o is QueryValidatorDistributionInfoRequest;
    isSDK(o: any): o is QueryValidatorDistributionInfoRequestSDKType;
    encode(message: QueryValidatorDistributionInfoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorDistributionInfoRequest;
    fromJSON(object: any): QueryValidatorDistributionInfoRequest;
    toJSON(message: QueryValidatorDistributionInfoRequest): JsonSafe<QueryValidatorDistributionInfoRequest>;
    fromPartial(object: Partial<QueryValidatorDistributionInfoRequest>): QueryValidatorDistributionInfoRequest;
    fromProtoMsg(message: QueryValidatorDistributionInfoRequestProtoMsg): QueryValidatorDistributionInfoRequest;
    toProto(message: QueryValidatorDistributionInfoRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorDistributionInfoRequest): QueryValidatorDistributionInfoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorDistributionInfoResponse is the response type for the Query/ValidatorDistributionInfo RPC method.
 * @name QueryValidatorDistributionInfoResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorDistributionInfoResponse
 */
export declare const QueryValidatorDistributionInfoResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorDistributionInfoResponse";
    aminoType: "cosmos-sdk/QueryValidatorDistributionInfoResponse";
    is(o: any): o is QueryValidatorDistributionInfoResponse;
    isSDK(o: any): o is QueryValidatorDistributionInfoResponseSDKType;
    encode(message: QueryValidatorDistributionInfoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorDistributionInfoResponse;
    fromJSON(object: any): QueryValidatorDistributionInfoResponse;
    toJSON(message: QueryValidatorDistributionInfoResponse): JsonSafe<QueryValidatorDistributionInfoResponse>;
    fromPartial(object: Partial<QueryValidatorDistributionInfoResponse>): QueryValidatorDistributionInfoResponse;
    fromProtoMsg(message: QueryValidatorDistributionInfoResponseProtoMsg): QueryValidatorDistributionInfoResponse;
    toProto(message: QueryValidatorDistributionInfoResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorDistributionInfoResponse): QueryValidatorDistributionInfoResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorOutstandingRewardsRequest is the request type for the
 * Query/ValidatorOutstandingRewards RPC method.
 * @name QueryValidatorOutstandingRewardsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest
 */
export declare const QueryValidatorOutstandingRewardsRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsRequest";
    aminoType: "cosmos-sdk/QueryValidatorOutstandingRewardsRequest";
    is(o: any): o is QueryValidatorOutstandingRewardsRequest;
    isSDK(o: any): o is QueryValidatorOutstandingRewardsRequestSDKType;
    encode(message: QueryValidatorOutstandingRewardsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorOutstandingRewardsRequest;
    fromJSON(object: any): QueryValidatorOutstandingRewardsRequest;
    toJSON(message: QueryValidatorOutstandingRewardsRequest): JsonSafe<QueryValidatorOutstandingRewardsRequest>;
    fromPartial(object: Partial<QueryValidatorOutstandingRewardsRequest>): QueryValidatorOutstandingRewardsRequest;
    fromProtoMsg(message: QueryValidatorOutstandingRewardsRequestProtoMsg): QueryValidatorOutstandingRewardsRequest;
    toProto(message: QueryValidatorOutstandingRewardsRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorOutstandingRewardsRequest): QueryValidatorOutstandingRewardsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorOutstandingRewardsResponse is the response type for the
 * Query/ValidatorOutstandingRewards RPC method.
 * @name QueryValidatorOutstandingRewardsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse
 */
export declare const QueryValidatorOutstandingRewardsResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorOutstandingRewardsResponse";
    aminoType: "cosmos-sdk/QueryValidatorOutstandingRewardsResponse";
    is(o: any): o is QueryValidatorOutstandingRewardsResponse;
    isSDK(o: any): o is QueryValidatorOutstandingRewardsResponseSDKType;
    encode(message: QueryValidatorOutstandingRewardsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorOutstandingRewardsResponse;
    fromJSON(object: any): QueryValidatorOutstandingRewardsResponse;
    toJSON(message: QueryValidatorOutstandingRewardsResponse): JsonSafe<QueryValidatorOutstandingRewardsResponse>;
    fromPartial(object: Partial<QueryValidatorOutstandingRewardsResponse>): QueryValidatorOutstandingRewardsResponse;
    fromProtoMsg(message: QueryValidatorOutstandingRewardsResponseProtoMsg): QueryValidatorOutstandingRewardsResponse;
    toProto(message: QueryValidatorOutstandingRewardsResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorOutstandingRewardsResponse): QueryValidatorOutstandingRewardsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorCommissionRequest is the request type for the
 * Query/ValidatorCommission RPC method
 * @name QueryValidatorCommissionRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorCommissionRequest
 */
export declare const QueryValidatorCommissionRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorCommissionRequest";
    aminoType: "cosmos-sdk/QueryValidatorCommissionRequest";
    is(o: any): o is QueryValidatorCommissionRequest;
    isSDK(o: any): o is QueryValidatorCommissionRequestSDKType;
    encode(message: QueryValidatorCommissionRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorCommissionRequest;
    fromJSON(object: any): QueryValidatorCommissionRequest;
    toJSON(message: QueryValidatorCommissionRequest): JsonSafe<QueryValidatorCommissionRequest>;
    fromPartial(object: Partial<QueryValidatorCommissionRequest>): QueryValidatorCommissionRequest;
    fromProtoMsg(message: QueryValidatorCommissionRequestProtoMsg): QueryValidatorCommissionRequest;
    toProto(message: QueryValidatorCommissionRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorCommissionRequest): QueryValidatorCommissionRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorCommissionResponse is the response type for the
 * Query/ValidatorCommission RPC method
 * @name QueryValidatorCommissionResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorCommissionResponse
 */
export declare const QueryValidatorCommissionResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorCommissionResponse";
    aminoType: "cosmos-sdk/QueryValidatorCommissionResponse";
    is(o: any): o is QueryValidatorCommissionResponse;
    isSDK(o: any): o is QueryValidatorCommissionResponseSDKType;
    encode(message: QueryValidatorCommissionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorCommissionResponse;
    fromJSON(object: any): QueryValidatorCommissionResponse;
    toJSON(message: QueryValidatorCommissionResponse): JsonSafe<QueryValidatorCommissionResponse>;
    fromPartial(object: Partial<QueryValidatorCommissionResponse>): QueryValidatorCommissionResponse;
    fromProtoMsg(message: QueryValidatorCommissionResponseProtoMsg): QueryValidatorCommissionResponse;
    toProto(message: QueryValidatorCommissionResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorCommissionResponse): QueryValidatorCommissionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorSlashesRequest is the request type for the
 * Query/ValidatorSlashes RPC method
 * @name QueryValidatorSlashesRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorSlashesRequest
 */
export declare const QueryValidatorSlashesRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorSlashesRequest";
    aminoType: "cosmos-sdk/QueryValidatorSlashesRequest";
    is(o: any): o is QueryValidatorSlashesRequest;
    isSDK(o: any): o is QueryValidatorSlashesRequestSDKType;
    encode(message: QueryValidatorSlashesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorSlashesRequest;
    fromJSON(object: any): QueryValidatorSlashesRequest;
    toJSON(message: QueryValidatorSlashesRequest): JsonSafe<QueryValidatorSlashesRequest>;
    fromPartial(object: Partial<QueryValidatorSlashesRequest>): QueryValidatorSlashesRequest;
    fromProtoMsg(message: QueryValidatorSlashesRequestProtoMsg): QueryValidatorSlashesRequest;
    toProto(message: QueryValidatorSlashesRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorSlashesRequest): QueryValidatorSlashesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorSlashesResponse is the response type for the
 * Query/ValidatorSlashes RPC method.
 * @name QueryValidatorSlashesResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryValidatorSlashesResponse
 */
export declare const QueryValidatorSlashesResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryValidatorSlashesResponse";
    aminoType: "cosmos-sdk/QueryValidatorSlashesResponse";
    is(o: any): o is QueryValidatorSlashesResponse;
    isSDK(o: any): o is QueryValidatorSlashesResponseSDKType;
    encode(message: QueryValidatorSlashesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorSlashesResponse;
    fromJSON(object: any): QueryValidatorSlashesResponse;
    toJSON(message: QueryValidatorSlashesResponse): JsonSafe<QueryValidatorSlashesResponse>;
    fromPartial(object: Partial<QueryValidatorSlashesResponse>): QueryValidatorSlashesResponse;
    fromProtoMsg(message: QueryValidatorSlashesResponseProtoMsg): QueryValidatorSlashesResponse;
    toProto(message: QueryValidatorSlashesResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorSlashesResponse): QueryValidatorSlashesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationRewardsRequest is the request type for the
 * Query/DelegationRewards RPC method.
 * @name QueryDelegationRewardsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationRewardsRequest
 */
export declare const QueryDelegationRewardsRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegationRewardsRequest";
    aminoType: "cosmos-sdk/QueryDelegationRewardsRequest";
    is(o: any): o is QueryDelegationRewardsRequest;
    isSDK(o: any): o is QueryDelegationRewardsRequestSDKType;
    encode(message: QueryDelegationRewardsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationRewardsRequest;
    fromJSON(object: any): QueryDelegationRewardsRequest;
    toJSON(message: QueryDelegationRewardsRequest): JsonSafe<QueryDelegationRewardsRequest>;
    fromPartial(object: Partial<QueryDelegationRewardsRequest>): QueryDelegationRewardsRequest;
    fromProtoMsg(message: QueryDelegationRewardsRequestProtoMsg): QueryDelegationRewardsRequest;
    toProto(message: QueryDelegationRewardsRequest): Uint8Array;
    toProtoMsg(message: QueryDelegationRewardsRequest): QueryDelegationRewardsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationRewardsResponse is the response type for the
 * Query/DelegationRewards RPC method.
 * @name QueryDelegationRewardsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationRewardsResponse
 */
export declare const QueryDelegationRewardsResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegationRewardsResponse";
    aminoType: "cosmos-sdk/QueryDelegationRewardsResponse";
    is(o: any): o is QueryDelegationRewardsResponse;
    isSDK(o: any): o is QueryDelegationRewardsResponseSDKType;
    encode(message: QueryDelegationRewardsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationRewardsResponse;
    fromJSON(object: any): QueryDelegationRewardsResponse;
    toJSON(message: QueryDelegationRewardsResponse): JsonSafe<QueryDelegationRewardsResponse>;
    fromPartial(object: Partial<QueryDelegationRewardsResponse>): QueryDelegationRewardsResponse;
    fromProtoMsg(message: QueryDelegationRewardsResponseProtoMsg): QueryDelegationRewardsResponse;
    toProto(message: QueryDelegationRewardsResponse): Uint8Array;
    toProtoMsg(message: QueryDelegationRewardsResponse): QueryDelegationRewardsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationTotalRewardsRequest is the request type for the
 * Query/DelegationTotalRewards RPC method.
 * @name QueryDelegationTotalRewardsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest
 */
export declare const QueryDelegationTotalRewardsRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsRequest";
    aminoType: "cosmos-sdk/QueryDelegationTotalRewardsRequest";
    is(o: any): o is QueryDelegationTotalRewardsRequest;
    isSDK(o: any): o is QueryDelegationTotalRewardsRequestSDKType;
    encode(message: QueryDelegationTotalRewardsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationTotalRewardsRequest;
    fromJSON(object: any): QueryDelegationTotalRewardsRequest;
    toJSON(message: QueryDelegationTotalRewardsRequest): JsonSafe<QueryDelegationTotalRewardsRequest>;
    fromPartial(object: Partial<QueryDelegationTotalRewardsRequest>): QueryDelegationTotalRewardsRequest;
    fromProtoMsg(message: QueryDelegationTotalRewardsRequestProtoMsg): QueryDelegationTotalRewardsRequest;
    toProto(message: QueryDelegationTotalRewardsRequest): Uint8Array;
    toProtoMsg(message: QueryDelegationTotalRewardsRequest): QueryDelegationTotalRewardsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationTotalRewardsResponse is the response type for the
 * Query/DelegationTotalRewards RPC method.
 * @name QueryDelegationTotalRewardsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse
 */
export declare const QueryDelegationTotalRewardsResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegationTotalRewardsResponse";
    aminoType: "cosmos-sdk/QueryDelegationTotalRewardsResponse";
    is(o: any): o is QueryDelegationTotalRewardsResponse;
    isSDK(o: any): o is QueryDelegationTotalRewardsResponseSDKType;
    encode(message: QueryDelegationTotalRewardsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationTotalRewardsResponse;
    fromJSON(object: any): QueryDelegationTotalRewardsResponse;
    toJSON(message: QueryDelegationTotalRewardsResponse): JsonSafe<QueryDelegationTotalRewardsResponse>;
    fromPartial(object: Partial<QueryDelegationTotalRewardsResponse>): QueryDelegationTotalRewardsResponse;
    fromProtoMsg(message: QueryDelegationTotalRewardsResponseProtoMsg): QueryDelegationTotalRewardsResponse;
    toProto(message: QueryDelegationTotalRewardsResponse): Uint8Array;
    toProtoMsg(message: QueryDelegationTotalRewardsResponse): QueryDelegationTotalRewardsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorValidatorsRequest is the request type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest
 */
export declare const QueryDelegatorValidatorsRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegatorValidatorsRequest";
    aminoType: "cosmos-sdk/QueryDelegatorValidatorsRequest";
    is(o: any): o is QueryDelegatorValidatorsRequest;
    isSDK(o: any): o is QueryDelegatorValidatorsRequestSDKType;
    encode(message: QueryDelegatorValidatorsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorValidatorsRequest;
    fromJSON(object: any): QueryDelegatorValidatorsRequest;
    toJSON(message: QueryDelegatorValidatorsRequest): JsonSafe<QueryDelegatorValidatorsRequest>;
    fromPartial(object: Partial<QueryDelegatorValidatorsRequest>): QueryDelegatorValidatorsRequest;
    fromProtoMsg(message: QueryDelegatorValidatorsRequestProtoMsg): QueryDelegatorValidatorsRequest;
    toProto(message: QueryDelegatorValidatorsRequest): Uint8Array;
    toProtoMsg(message: QueryDelegatorValidatorsRequest): QueryDelegatorValidatorsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorValidatorsResponse is the response type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse
 */
export declare const QueryDelegatorValidatorsResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegatorValidatorsResponse";
    aminoType: "cosmos-sdk/QueryDelegatorValidatorsResponse";
    is(o: any): o is QueryDelegatorValidatorsResponse;
    isSDK(o: any): o is QueryDelegatorValidatorsResponseSDKType;
    encode(message: QueryDelegatorValidatorsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorValidatorsResponse;
    fromJSON(object: any): QueryDelegatorValidatorsResponse;
    toJSON(message: QueryDelegatorValidatorsResponse): JsonSafe<QueryDelegatorValidatorsResponse>;
    fromPartial(object: Partial<QueryDelegatorValidatorsResponse>): QueryDelegatorValidatorsResponse;
    fromProtoMsg(message: QueryDelegatorValidatorsResponseProtoMsg): QueryDelegatorValidatorsResponse;
    toProto(message: QueryDelegatorValidatorsResponse): Uint8Array;
    toProtoMsg(message: QueryDelegatorValidatorsResponse): QueryDelegatorValidatorsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorWithdrawAddressRequest is the request type for the
 * Query/DelegatorWithdrawAddress RPC method.
 * @name QueryDelegatorWithdrawAddressRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest
 */
export declare const QueryDelegatorWithdrawAddressRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressRequest";
    aminoType: "cosmos-sdk/QueryDelegatorWithdrawAddressRequest";
    is(o: any): o is QueryDelegatorWithdrawAddressRequest;
    isSDK(o: any): o is QueryDelegatorWithdrawAddressRequestSDKType;
    encode(message: QueryDelegatorWithdrawAddressRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorWithdrawAddressRequest;
    fromJSON(object: any): QueryDelegatorWithdrawAddressRequest;
    toJSON(message: QueryDelegatorWithdrawAddressRequest): JsonSafe<QueryDelegatorWithdrawAddressRequest>;
    fromPartial(object: Partial<QueryDelegatorWithdrawAddressRequest>): QueryDelegatorWithdrawAddressRequest;
    fromProtoMsg(message: QueryDelegatorWithdrawAddressRequestProtoMsg): QueryDelegatorWithdrawAddressRequest;
    toProto(message: QueryDelegatorWithdrawAddressRequest): Uint8Array;
    toProtoMsg(message: QueryDelegatorWithdrawAddressRequest): QueryDelegatorWithdrawAddressRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorWithdrawAddressResponse is the response type for the
 * Query/DelegatorWithdrawAddress RPC method.
 * @name QueryDelegatorWithdrawAddressResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse
 */
export declare const QueryDelegatorWithdrawAddressResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryDelegatorWithdrawAddressResponse";
    aminoType: "cosmos-sdk/QueryDelegatorWithdrawAddressResponse";
    is(o: any): o is QueryDelegatorWithdrawAddressResponse;
    isSDK(o: any): o is QueryDelegatorWithdrawAddressResponseSDKType;
    encode(message: QueryDelegatorWithdrawAddressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorWithdrawAddressResponse;
    fromJSON(object: any): QueryDelegatorWithdrawAddressResponse;
    toJSON(message: QueryDelegatorWithdrawAddressResponse): JsonSafe<QueryDelegatorWithdrawAddressResponse>;
    fromPartial(object: Partial<QueryDelegatorWithdrawAddressResponse>): QueryDelegatorWithdrawAddressResponse;
    fromProtoMsg(message: QueryDelegatorWithdrawAddressResponseProtoMsg): QueryDelegatorWithdrawAddressResponse;
    toProto(message: QueryDelegatorWithdrawAddressResponse): Uint8Array;
    toProtoMsg(message: QueryDelegatorWithdrawAddressResponse): QueryDelegatorWithdrawAddressResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 * @name QueryCommunityPoolRequest
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryCommunityPoolRequest
 */
export declare const QueryCommunityPoolRequest: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryCommunityPoolRequest";
    aminoType: "cosmos-sdk/QueryCommunityPoolRequest";
    is(o: any): o is QueryCommunityPoolRequest;
    isSDK(o: any): o is QueryCommunityPoolRequestSDKType;
    encode(_: QueryCommunityPoolRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCommunityPoolRequest;
    fromJSON(_: any): QueryCommunityPoolRequest;
    toJSON(_: QueryCommunityPoolRequest): JsonSafe<QueryCommunityPoolRequest>;
    fromPartial(_: Partial<QueryCommunityPoolRequest>): QueryCommunityPoolRequest;
    fromProtoMsg(message: QueryCommunityPoolRequestProtoMsg): QueryCommunityPoolRequest;
    toProto(message: QueryCommunityPoolRequest): Uint8Array;
    toProtoMsg(message: QueryCommunityPoolRequest): QueryCommunityPoolRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 * @name QueryCommunityPoolResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.QueryCommunityPoolResponse
 */
export declare const QueryCommunityPoolResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.QueryCommunityPoolResponse";
    aminoType: "cosmos-sdk/QueryCommunityPoolResponse";
    is(o: any): o is QueryCommunityPoolResponse;
    isSDK(o: any): o is QueryCommunityPoolResponseSDKType;
    encode(message: QueryCommunityPoolResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCommunityPoolResponse;
    fromJSON(object: any): QueryCommunityPoolResponse;
    toJSON(message: QueryCommunityPoolResponse): JsonSafe<QueryCommunityPoolResponse>;
    fromPartial(object: Partial<QueryCommunityPoolResponse>): QueryCommunityPoolResponse;
    fromProtoMsg(message: QueryCommunityPoolResponseProtoMsg): QueryCommunityPoolResponse;
    toProto(message: QueryCommunityPoolResponse): Uint8Array;
    toProtoMsg(message: QueryCommunityPoolResponse): QueryCommunityPoolResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map