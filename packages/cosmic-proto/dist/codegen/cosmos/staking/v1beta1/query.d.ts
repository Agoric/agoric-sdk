import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { Validator, type ValidatorSDKType, DelegationResponse, type DelegationResponseSDKType, UnbondingDelegation, type UnbondingDelegationSDKType, RedelegationResponse, type RedelegationResponseSDKType, HistoricalInfo, type HistoricalInfoSDKType, Pool, type PoolSDKType, Params, type ParamsSDKType } from './staking.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryValidatorsRequest is request type for Query/Validators RPC method.
 * @name QueryValidatorsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorsRequest
 */
export interface QueryValidatorsRequest {
    /**
     * status enables to query for validators matching a given status.
     */
    status: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryValidatorsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorsRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorsRequest is request type for Query/Validators RPC method.
 * @name QueryValidatorsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorsRequest
 */
export interface QueryValidatorsRequestSDKType {
    status: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryValidatorsResponse is response type for the Query/Validators RPC method
 * @name QueryValidatorsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorsResponse
 */
export interface QueryValidatorsResponse {
    /**
     * validators contains all the queried validators.
     */
    validators: Validator[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryValidatorsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorsResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorsResponse is response type for the Query/Validators RPC method
 * @name QueryValidatorsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorsResponse
 */
export interface QueryValidatorsResponseSDKType {
    validators: ValidatorSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryValidatorRequest is response type for the Query/Validator RPC method
 * @name QueryValidatorRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorRequest
 */
export interface QueryValidatorRequest {
    /**
     * validator_addr defines the validator address to query for.
     */
    validatorAddr: string;
}
export interface QueryValidatorRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorRequest is response type for the Query/Validator RPC method
 * @name QueryValidatorRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorRequest
 */
export interface QueryValidatorRequestSDKType {
    validator_addr: string;
}
/**
 * QueryValidatorResponse is response type for the Query/Validator RPC method
 * @name QueryValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorResponse
 */
export interface QueryValidatorResponse {
    /**
     * validator defines the validator info.
     */
    validator: Validator;
}
export interface QueryValidatorResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorResponse is response type for the Query/Validator RPC method
 * @name QueryValidatorResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorResponse
 */
export interface QueryValidatorResponseSDKType {
    validator: ValidatorSDKType;
}
/**
 * QueryValidatorDelegationsRequest is request type for the
 * Query/ValidatorDelegations RPC method
 * @name QueryValidatorDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorDelegationsRequest
 */
export interface QueryValidatorDelegationsRequest {
    /**
     * validator_addr defines the validator address to query for.
     */
    validatorAddr: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryValidatorDelegationsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorDelegationsRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorDelegationsRequest is request type for the
 * Query/ValidatorDelegations RPC method
 * @name QueryValidatorDelegationsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorDelegationsRequest
 */
export interface QueryValidatorDelegationsRequestSDKType {
    validator_addr: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryValidatorDelegationsResponse is response type for the
 * Query/ValidatorDelegations RPC method
 * @name QueryValidatorDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorDelegationsResponse
 */
export interface QueryValidatorDelegationsResponse {
    delegationResponses: DelegationResponse[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryValidatorDelegationsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorDelegationsResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorDelegationsResponse is response type for the
 * Query/ValidatorDelegations RPC method
 * @name QueryValidatorDelegationsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorDelegationsResponse
 */
export interface QueryValidatorDelegationsResponseSDKType {
    delegation_responses: DelegationResponseSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryValidatorUnbondingDelegationsRequest is required type for the
 * Query/ValidatorUnbondingDelegations RPC method
 * @name QueryValidatorUnbondingDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsRequest
 */
export interface QueryValidatorUnbondingDelegationsRequest {
    /**
     * validator_addr defines the validator address to query for.
     */
    validatorAddr: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryValidatorUnbondingDelegationsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsRequest';
    value: Uint8Array;
}
/**
 * QueryValidatorUnbondingDelegationsRequest is required type for the
 * Query/ValidatorUnbondingDelegations RPC method
 * @name QueryValidatorUnbondingDelegationsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsRequest
 */
export interface QueryValidatorUnbondingDelegationsRequestSDKType {
    validator_addr: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryValidatorUnbondingDelegationsResponse is response type for the
 * Query/ValidatorUnbondingDelegations RPC method.
 * @name QueryValidatorUnbondingDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsResponse
 */
export interface QueryValidatorUnbondingDelegationsResponse {
    unbondingResponses: UnbondingDelegation[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryValidatorUnbondingDelegationsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsResponse';
    value: Uint8Array;
}
/**
 * QueryValidatorUnbondingDelegationsResponse is response type for the
 * Query/ValidatorUnbondingDelegations RPC method.
 * @name QueryValidatorUnbondingDelegationsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsResponse
 */
export interface QueryValidatorUnbondingDelegationsResponseSDKType {
    unbonding_responses: UnbondingDelegationSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDelegationRequest is request type for the Query/Delegation RPC method.
 * @name QueryDelegationRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegationRequest
 */
export interface QueryDelegationRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * validator_addr defines the validator address to query for.
     */
    validatorAddr: string;
}
export interface QueryDelegationRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegationRequest';
    value: Uint8Array;
}
/**
 * QueryDelegationRequest is request type for the Query/Delegation RPC method.
 * @name QueryDelegationRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegationRequest
 */
export interface QueryDelegationRequestSDKType {
    delegator_addr: string;
    validator_addr: string;
}
/**
 * QueryDelegationResponse is response type for the Query/Delegation RPC method.
 * @name QueryDelegationResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegationResponse
 */
export interface QueryDelegationResponse {
    /**
     * delegation_responses defines the delegation info of a delegation.
     */
    delegationResponse?: DelegationResponse;
}
export interface QueryDelegationResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegationResponse';
    value: Uint8Array;
}
/**
 * QueryDelegationResponse is response type for the Query/Delegation RPC method.
 * @name QueryDelegationResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegationResponse
 */
export interface QueryDelegationResponseSDKType {
    delegation_response?: DelegationResponseSDKType;
}
/**
 * QueryUnbondingDelegationRequest is request type for the
 * Query/UnbondingDelegation RPC method.
 * @name QueryUnbondingDelegationRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryUnbondingDelegationRequest
 */
export interface QueryUnbondingDelegationRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * validator_addr defines the validator address to query for.
     */
    validatorAddr: string;
}
export interface QueryUnbondingDelegationRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryUnbondingDelegationRequest';
    value: Uint8Array;
}
/**
 * QueryUnbondingDelegationRequest is request type for the
 * Query/UnbondingDelegation RPC method.
 * @name QueryUnbondingDelegationRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryUnbondingDelegationRequest
 */
export interface QueryUnbondingDelegationRequestSDKType {
    delegator_addr: string;
    validator_addr: string;
}
/**
 * QueryDelegationResponse is response type for the Query/UnbondingDelegation
 * RPC method.
 * @name QueryUnbondingDelegationResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryUnbondingDelegationResponse
 */
export interface QueryUnbondingDelegationResponse {
    /**
     * unbond defines the unbonding information of a delegation.
     */
    unbond: UnbondingDelegation;
}
export interface QueryUnbondingDelegationResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryUnbondingDelegationResponse';
    value: Uint8Array;
}
/**
 * QueryDelegationResponse is response type for the Query/UnbondingDelegation
 * RPC method.
 * @name QueryUnbondingDelegationResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryUnbondingDelegationResponse
 */
export interface QueryUnbondingDelegationResponseSDKType {
    unbond: UnbondingDelegationSDKType;
}
/**
 * QueryDelegatorDelegationsRequest is request type for the
 * Query/DelegatorDelegations RPC method.
 * @name QueryDelegatorDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorDelegationsRequest
 */
export interface QueryDelegatorDelegationsRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDelegatorDelegationsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorDelegationsRequest';
    value: Uint8Array;
}
/**
 * QueryDelegatorDelegationsRequest is request type for the
 * Query/DelegatorDelegations RPC method.
 * @name QueryDelegatorDelegationsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorDelegationsRequest
 */
export interface QueryDelegatorDelegationsRequestSDKType {
    delegator_addr: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryDelegatorDelegationsResponse is response type for the
 * Query/DelegatorDelegations RPC method.
 * @name QueryDelegatorDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorDelegationsResponse
 */
export interface QueryDelegatorDelegationsResponse {
    /**
     * delegation_responses defines all the delegations' info of a delegator.
     */
    delegationResponses: DelegationResponse[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDelegatorDelegationsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorDelegationsResponse';
    value: Uint8Array;
}
/**
 * QueryDelegatorDelegationsResponse is response type for the
 * Query/DelegatorDelegations RPC method.
 * @name QueryDelegatorDelegationsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorDelegationsResponse
 */
export interface QueryDelegatorDelegationsResponseSDKType {
    delegation_responses: DelegationResponseSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDelegatorUnbondingDelegationsRequest is request type for the
 * Query/DelegatorUnbondingDelegations RPC method.
 * @name QueryDelegatorUnbondingDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsRequest
 */
export interface QueryDelegatorUnbondingDelegationsRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDelegatorUnbondingDelegationsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsRequest';
    value: Uint8Array;
}
/**
 * QueryDelegatorUnbondingDelegationsRequest is request type for the
 * Query/DelegatorUnbondingDelegations RPC method.
 * @name QueryDelegatorUnbondingDelegationsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsRequest
 */
export interface QueryDelegatorUnbondingDelegationsRequestSDKType {
    delegator_addr: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryUnbondingDelegatorDelegationsResponse is response type for the
 * Query/UnbondingDelegatorDelegations RPC method.
 * @name QueryDelegatorUnbondingDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsResponse
 */
export interface QueryDelegatorUnbondingDelegationsResponse {
    unbondingResponses: UnbondingDelegation[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDelegatorUnbondingDelegationsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsResponse';
    value: Uint8Array;
}
/**
 * QueryUnbondingDelegatorDelegationsResponse is response type for the
 * Query/UnbondingDelegatorDelegations RPC method.
 * @name QueryDelegatorUnbondingDelegationsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsResponse
 */
export interface QueryDelegatorUnbondingDelegationsResponseSDKType {
    unbonding_responses: UnbondingDelegationSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryRedelegationsRequest is request type for the Query/Redelegations RPC
 * method.
 * @name QueryRedelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryRedelegationsRequest
 */
export interface QueryRedelegationsRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * src_validator_addr defines the validator address to redelegate from.
     */
    srcValidatorAddr: string;
    /**
     * dst_validator_addr defines the validator address to redelegate to.
     */
    dstValidatorAddr: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryRedelegationsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryRedelegationsRequest';
    value: Uint8Array;
}
/**
 * QueryRedelegationsRequest is request type for the Query/Redelegations RPC
 * method.
 * @name QueryRedelegationsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryRedelegationsRequest
 */
export interface QueryRedelegationsRequestSDKType {
    delegator_addr: string;
    src_validator_addr: string;
    dst_validator_addr: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryRedelegationsResponse is response type for the Query/Redelegations RPC
 * method.
 * @name QueryRedelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryRedelegationsResponse
 */
export interface QueryRedelegationsResponse {
    redelegationResponses: RedelegationResponse[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryRedelegationsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryRedelegationsResponse';
    value: Uint8Array;
}
/**
 * QueryRedelegationsResponse is response type for the Query/Redelegations RPC
 * method.
 * @name QueryRedelegationsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryRedelegationsResponse
 */
export interface QueryRedelegationsResponseSDKType {
    redelegation_responses: RedelegationResponseSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDelegatorValidatorsRequest is request type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorsRequest
 */
export interface QueryDelegatorValidatorsRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDelegatorValidatorsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorValidatorsRequest';
    value: Uint8Array;
}
/**
 * QueryDelegatorValidatorsRequest is request type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorsRequest
 */
export interface QueryDelegatorValidatorsRequestSDKType {
    delegator_addr: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryDelegatorValidatorsResponse is response type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorsResponse
 */
export interface QueryDelegatorValidatorsResponse {
    /**
     * validators defines the validators' info of a delegator.
     */
    validators: Validator[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDelegatorValidatorsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorValidatorsResponse';
    value: Uint8Array;
}
/**
 * QueryDelegatorValidatorsResponse is response type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorsResponse
 */
export interface QueryDelegatorValidatorsResponseSDKType {
    validators: ValidatorSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDelegatorValidatorRequest is request type for the
 * Query/DelegatorValidator RPC method.
 * @name QueryDelegatorValidatorRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorRequest
 */
export interface QueryDelegatorValidatorRequest {
    /**
     * delegator_addr defines the delegator address to query for.
     */
    delegatorAddr: string;
    /**
     * validator_addr defines the validator address to query for.
     */
    validatorAddr: string;
}
export interface QueryDelegatorValidatorRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorValidatorRequest';
    value: Uint8Array;
}
/**
 * QueryDelegatorValidatorRequest is request type for the
 * Query/DelegatorValidator RPC method.
 * @name QueryDelegatorValidatorRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorRequest
 */
export interface QueryDelegatorValidatorRequestSDKType {
    delegator_addr: string;
    validator_addr: string;
}
/**
 * QueryDelegatorValidatorResponse response type for the
 * Query/DelegatorValidator RPC method.
 * @name QueryDelegatorValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorResponse
 */
export interface QueryDelegatorValidatorResponse {
    /**
     * validator defines the validator info.
     */
    validator: Validator;
}
export interface QueryDelegatorValidatorResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryDelegatorValidatorResponse';
    value: Uint8Array;
}
/**
 * QueryDelegatorValidatorResponse response type for the
 * Query/DelegatorValidator RPC method.
 * @name QueryDelegatorValidatorResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorResponse
 */
export interface QueryDelegatorValidatorResponseSDKType {
    validator: ValidatorSDKType;
}
/**
 * QueryHistoricalInfoRequest is request type for the Query/HistoricalInfo RPC
 * method.
 * @name QueryHistoricalInfoRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryHistoricalInfoRequest
 */
export interface QueryHistoricalInfoRequest {
    /**
     * height defines at which height to query the historical info.
     */
    height: bigint;
}
export interface QueryHistoricalInfoRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryHistoricalInfoRequest';
    value: Uint8Array;
}
/**
 * QueryHistoricalInfoRequest is request type for the Query/HistoricalInfo RPC
 * method.
 * @name QueryHistoricalInfoRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryHistoricalInfoRequest
 */
export interface QueryHistoricalInfoRequestSDKType {
    height: bigint;
}
/**
 * QueryHistoricalInfoResponse is response type for the Query/HistoricalInfo RPC
 * method.
 * @name QueryHistoricalInfoResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryHistoricalInfoResponse
 */
export interface QueryHistoricalInfoResponse {
    /**
     * hist defines the historical info at the given height.
     */
    hist?: HistoricalInfo;
}
export interface QueryHistoricalInfoResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryHistoricalInfoResponse';
    value: Uint8Array;
}
/**
 * QueryHistoricalInfoResponse is response type for the Query/HistoricalInfo RPC
 * method.
 * @name QueryHistoricalInfoResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryHistoricalInfoResponse
 */
export interface QueryHistoricalInfoResponseSDKType {
    hist?: HistoricalInfoSDKType;
}
/**
 * QueryPoolRequest is request type for the Query/Pool RPC method.
 * @name QueryPoolRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryPoolRequest
 */
export interface QueryPoolRequest {
}
export interface QueryPoolRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryPoolRequest';
    value: Uint8Array;
}
/**
 * QueryPoolRequest is request type for the Query/Pool RPC method.
 * @name QueryPoolRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryPoolRequest
 */
export interface QueryPoolRequestSDKType {
}
/**
 * QueryPoolResponse is response type for the Query/Pool RPC method.
 * @name QueryPoolResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryPoolResponse
 */
export interface QueryPoolResponse {
    /**
     * pool defines the pool info.
     */
    pool: Pool;
}
export interface QueryPoolResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryPoolResponse';
    value: Uint8Array;
}
/**
 * QueryPoolResponse is response type for the Query/Pool RPC method.
 * @name QueryPoolResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryPoolResponse
 */
export interface QueryPoolResponseSDKType {
    pool: PoolSDKType;
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params holds all the parameters of this module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryValidatorsRequest is request type for Query/Validators RPC method.
 * @name QueryValidatorsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorsRequest
 */
export declare const QueryValidatorsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorsRequest";
    aminoType: "cosmos-sdk/QueryValidatorsRequest";
    is(o: any): o is QueryValidatorsRequest;
    isSDK(o: any): o is QueryValidatorsRequestSDKType;
    encode(message: QueryValidatorsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorsRequest;
    fromJSON(object: any): QueryValidatorsRequest;
    toJSON(message: QueryValidatorsRequest): JsonSafe<QueryValidatorsRequest>;
    fromPartial(object: Partial<QueryValidatorsRequest>): QueryValidatorsRequest;
    fromProtoMsg(message: QueryValidatorsRequestProtoMsg): QueryValidatorsRequest;
    toProto(message: QueryValidatorsRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorsRequest): QueryValidatorsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorsResponse is response type for the Query/Validators RPC method
 * @name QueryValidatorsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorsResponse
 */
export declare const QueryValidatorsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorsResponse";
    aminoType: "cosmos-sdk/QueryValidatorsResponse";
    is(o: any): o is QueryValidatorsResponse;
    isSDK(o: any): o is QueryValidatorsResponseSDKType;
    encode(message: QueryValidatorsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorsResponse;
    fromJSON(object: any): QueryValidatorsResponse;
    toJSON(message: QueryValidatorsResponse): JsonSafe<QueryValidatorsResponse>;
    fromPartial(object: Partial<QueryValidatorsResponse>): QueryValidatorsResponse;
    fromProtoMsg(message: QueryValidatorsResponseProtoMsg): QueryValidatorsResponse;
    toProto(message: QueryValidatorsResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorsResponse): QueryValidatorsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorRequest is response type for the Query/Validator RPC method
 * @name QueryValidatorRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorRequest
 */
export declare const QueryValidatorRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorRequest";
    aminoType: "cosmos-sdk/QueryValidatorRequest";
    is(o: any): o is QueryValidatorRequest;
    isSDK(o: any): o is QueryValidatorRequestSDKType;
    encode(message: QueryValidatorRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorRequest;
    fromJSON(object: any): QueryValidatorRequest;
    toJSON(message: QueryValidatorRequest): JsonSafe<QueryValidatorRequest>;
    fromPartial(object: Partial<QueryValidatorRequest>): QueryValidatorRequest;
    fromProtoMsg(message: QueryValidatorRequestProtoMsg): QueryValidatorRequest;
    toProto(message: QueryValidatorRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorRequest): QueryValidatorRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorResponse is response type for the Query/Validator RPC method
 * @name QueryValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorResponse
 */
export declare const QueryValidatorResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorResponse";
    aminoType: "cosmos-sdk/QueryValidatorResponse";
    is(o: any): o is QueryValidatorResponse;
    isSDK(o: any): o is QueryValidatorResponseSDKType;
    encode(message: QueryValidatorResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorResponse;
    fromJSON(object: any): QueryValidatorResponse;
    toJSON(message: QueryValidatorResponse): JsonSafe<QueryValidatorResponse>;
    fromPartial(object: Partial<QueryValidatorResponse>): QueryValidatorResponse;
    fromProtoMsg(message: QueryValidatorResponseProtoMsg): QueryValidatorResponse;
    toProto(message: QueryValidatorResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorResponse): QueryValidatorResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorDelegationsRequest is request type for the
 * Query/ValidatorDelegations RPC method
 * @name QueryValidatorDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorDelegationsRequest
 */
export declare const QueryValidatorDelegationsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorDelegationsRequest";
    aminoType: "cosmos-sdk/QueryValidatorDelegationsRequest";
    is(o: any): o is QueryValidatorDelegationsRequest;
    isSDK(o: any): o is QueryValidatorDelegationsRequestSDKType;
    encode(message: QueryValidatorDelegationsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorDelegationsRequest;
    fromJSON(object: any): QueryValidatorDelegationsRequest;
    toJSON(message: QueryValidatorDelegationsRequest): JsonSafe<QueryValidatorDelegationsRequest>;
    fromPartial(object: Partial<QueryValidatorDelegationsRequest>): QueryValidatorDelegationsRequest;
    fromProtoMsg(message: QueryValidatorDelegationsRequestProtoMsg): QueryValidatorDelegationsRequest;
    toProto(message: QueryValidatorDelegationsRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorDelegationsRequest): QueryValidatorDelegationsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorDelegationsResponse is response type for the
 * Query/ValidatorDelegations RPC method
 * @name QueryValidatorDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorDelegationsResponse
 */
export declare const QueryValidatorDelegationsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorDelegationsResponse";
    aminoType: "cosmos-sdk/QueryValidatorDelegationsResponse";
    is(o: any): o is QueryValidatorDelegationsResponse;
    isSDK(o: any): o is QueryValidatorDelegationsResponseSDKType;
    encode(message: QueryValidatorDelegationsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorDelegationsResponse;
    fromJSON(object: any): QueryValidatorDelegationsResponse;
    toJSON(message: QueryValidatorDelegationsResponse): JsonSafe<QueryValidatorDelegationsResponse>;
    fromPartial(object: Partial<QueryValidatorDelegationsResponse>): QueryValidatorDelegationsResponse;
    fromProtoMsg(message: QueryValidatorDelegationsResponseProtoMsg): QueryValidatorDelegationsResponse;
    toProto(message: QueryValidatorDelegationsResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorDelegationsResponse): QueryValidatorDelegationsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorUnbondingDelegationsRequest is required type for the
 * Query/ValidatorUnbondingDelegations RPC method
 * @name QueryValidatorUnbondingDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsRequest
 */
export declare const QueryValidatorUnbondingDelegationsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsRequest";
    aminoType: "cosmos-sdk/QueryValidatorUnbondingDelegationsRequest";
    is(o: any): o is QueryValidatorUnbondingDelegationsRequest;
    isSDK(o: any): o is QueryValidatorUnbondingDelegationsRequestSDKType;
    encode(message: QueryValidatorUnbondingDelegationsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorUnbondingDelegationsRequest;
    fromJSON(object: any): QueryValidatorUnbondingDelegationsRequest;
    toJSON(message: QueryValidatorUnbondingDelegationsRequest): JsonSafe<QueryValidatorUnbondingDelegationsRequest>;
    fromPartial(object: Partial<QueryValidatorUnbondingDelegationsRequest>): QueryValidatorUnbondingDelegationsRequest;
    fromProtoMsg(message: QueryValidatorUnbondingDelegationsRequestProtoMsg): QueryValidatorUnbondingDelegationsRequest;
    toProto(message: QueryValidatorUnbondingDelegationsRequest): Uint8Array;
    toProtoMsg(message: QueryValidatorUnbondingDelegationsRequest): QueryValidatorUnbondingDelegationsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryValidatorUnbondingDelegationsResponse is response type for the
 * Query/ValidatorUnbondingDelegations RPC method.
 * @name QueryValidatorUnbondingDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsResponse
 */
export declare const QueryValidatorUnbondingDelegationsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryValidatorUnbondingDelegationsResponse";
    aminoType: "cosmos-sdk/QueryValidatorUnbondingDelegationsResponse";
    is(o: any): o is QueryValidatorUnbondingDelegationsResponse;
    isSDK(o: any): o is QueryValidatorUnbondingDelegationsResponseSDKType;
    encode(message: QueryValidatorUnbondingDelegationsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryValidatorUnbondingDelegationsResponse;
    fromJSON(object: any): QueryValidatorUnbondingDelegationsResponse;
    toJSON(message: QueryValidatorUnbondingDelegationsResponse): JsonSafe<QueryValidatorUnbondingDelegationsResponse>;
    fromPartial(object: Partial<QueryValidatorUnbondingDelegationsResponse>): QueryValidatorUnbondingDelegationsResponse;
    fromProtoMsg(message: QueryValidatorUnbondingDelegationsResponseProtoMsg): QueryValidatorUnbondingDelegationsResponse;
    toProto(message: QueryValidatorUnbondingDelegationsResponse): Uint8Array;
    toProtoMsg(message: QueryValidatorUnbondingDelegationsResponse): QueryValidatorUnbondingDelegationsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationRequest is request type for the Query/Delegation RPC method.
 * @name QueryDelegationRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegationRequest
 */
export declare const QueryDelegationRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegationRequest";
    aminoType: "cosmos-sdk/QueryDelegationRequest";
    is(o: any): o is QueryDelegationRequest;
    isSDK(o: any): o is QueryDelegationRequestSDKType;
    encode(message: QueryDelegationRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationRequest;
    fromJSON(object: any): QueryDelegationRequest;
    toJSON(message: QueryDelegationRequest): JsonSafe<QueryDelegationRequest>;
    fromPartial(object: Partial<QueryDelegationRequest>): QueryDelegationRequest;
    fromProtoMsg(message: QueryDelegationRequestProtoMsg): QueryDelegationRequest;
    toProto(message: QueryDelegationRequest): Uint8Array;
    toProtoMsg(message: QueryDelegationRequest): QueryDelegationRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationResponse is response type for the Query/Delegation RPC method.
 * @name QueryDelegationResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegationResponse
 */
export declare const QueryDelegationResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegationResponse";
    aminoType: "cosmos-sdk/QueryDelegationResponse";
    is(o: any): o is QueryDelegationResponse;
    isSDK(o: any): o is QueryDelegationResponseSDKType;
    encode(message: QueryDelegationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationResponse;
    fromJSON(object: any): QueryDelegationResponse;
    toJSON(message: QueryDelegationResponse): JsonSafe<QueryDelegationResponse>;
    fromPartial(object: Partial<QueryDelegationResponse>): QueryDelegationResponse;
    fromProtoMsg(message: QueryDelegationResponseProtoMsg): QueryDelegationResponse;
    toProto(message: QueryDelegationResponse): Uint8Array;
    toProtoMsg(message: QueryDelegationResponse): QueryDelegationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUnbondingDelegationRequest is request type for the
 * Query/UnbondingDelegation RPC method.
 * @name QueryUnbondingDelegationRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryUnbondingDelegationRequest
 */
export declare const QueryUnbondingDelegationRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryUnbondingDelegationRequest";
    aminoType: "cosmos-sdk/QueryUnbondingDelegationRequest";
    is(o: any): o is QueryUnbondingDelegationRequest;
    isSDK(o: any): o is QueryUnbondingDelegationRequestSDKType;
    encode(message: QueryUnbondingDelegationRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnbondingDelegationRequest;
    fromJSON(object: any): QueryUnbondingDelegationRequest;
    toJSON(message: QueryUnbondingDelegationRequest): JsonSafe<QueryUnbondingDelegationRequest>;
    fromPartial(object: Partial<QueryUnbondingDelegationRequest>): QueryUnbondingDelegationRequest;
    fromProtoMsg(message: QueryUnbondingDelegationRequestProtoMsg): QueryUnbondingDelegationRequest;
    toProto(message: QueryUnbondingDelegationRequest): Uint8Array;
    toProtoMsg(message: QueryUnbondingDelegationRequest): QueryUnbondingDelegationRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegationResponse is response type for the Query/UnbondingDelegation
 * RPC method.
 * @name QueryUnbondingDelegationResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryUnbondingDelegationResponse
 */
export declare const QueryUnbondingDelegationResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryUnbondingDelegationResponse";
    aminoType: "cosmos-sdk/QueryUnbondingDelegationResponse";
    is(o: any): o is QueryUnbondingDelegationResponse;
    isSDK(o: any): o is QueryUnbondingDelegationResponseSDKType;
    encode(message: QueryUnbondingDelegationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnbondingDelegationResponse;
    fromJSON(object: any): QueryUnbondingDelegationResponse;
    toJSON(message: QueryUnbondingDelegationResponse): JsonSafe<QueryUnbondingDelegationResponse>;
    fromPartial(object: Partial<QueryUnbondingDelegationResponse>): QueryUnbondingDelegationResponse;
    fromProtoMsg(message: QueryUnbondingDelegationResponseProtoMsg): QueryUnbondingDelegationResponse;
    toProto(message: QueryUnbondingDelegationResponse): Uint8Array;
    toProtoMsg(message: QueryUnbondingDelegationResponse): QueryUnbondingDelegationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorDelegationsRequest is request type for the
 * Query/DelegatorDelegations RPC method.
 * @name QueryDelegatorDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorDelegationsRequest
 */
export declare const QueryDelegatorDelegationsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorDelegationsRequest";
    aminoType: "cosmos-sdk/QueryDelegatorDelegationsRequest";
    is(o: any): o is QueryDelegatorDelegationsRequest;
    isSDK(o: any): o is QueryDelegatorDelegationsRequestSDKType;
    encode(message: QueryDelegatorDelegationsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorDelegationsRequest;
    fromJSON(object: any): QueryDelegatorDelegationsRequest;
    toJSON(message: QueryDelegatorDelegationsRequest): JsonSafe<QueryDelegatorDelegationsRequest>;
    fromPartial(object: Partial<QueryDelegatorDelegationsRequest>): QueryDelegatorDelegationsRequest;
    fromProtoMsg(message: QueryDelegatorDelegationsRequestProtoMsg): QueryDelegatorDelegationsRequest;
    toProto(message: QueryDelegatorDelegationsRequest): Uint8Array;
    toProtoMsg(message: QueryDelegatorDelegationsRequest): QueryDelegatorDelegationsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorDelegationsResponse is response type for the
 * Query/DelegatorDelegations RPC method.
 * @name QueryDelegatorDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorDelegationsResponse
 */
export declare const QueryDelegatorDelegationsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorDelegationsResponse";
    aminoType: "cosmos-sdk/QueryDelegatorDelegationsResponse";
    is(o: any): o is QueryDelegatorDelegationsResponse;
    isSDK(o: any): o is QueryDelegatorDelegationsResponseSDKType;
    encode(message: QueryDelegatorDelegationsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorDelegationsResponse;
    fromJSON(object: any): QueryDelegatorDelegationsResponse;
    toJSON(message: QueryDelegatorDelegationsResponse): JsonSafe<QueryDelegatorDelegationsResponse>;
    fromPartial(object: Partial<QueryDelegatorDelegationsResponse>): QueryDelegatorDelegationsResponse;
    fromProtoMsg(message: QueryDelegatorDelegationsResponseProtoMsg): QueryDelegatorDelegationsResponse;
    toProto(message: QueryDelegatorDelegationsResponse): Uint8Array;
    toProtoMsg(message: QueryDelegatorDelegationsResponse): QueryDelegatorDelegationsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorUnbondingDelegationsRequest is request type for the
 * Query/DelegatorUnbondingDelegations RPC method.
 * @name QueryDelegatorUnbondingDelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsRequest
 */
export declare const QueryDelegatorUnbondingDelegationsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsRequest";
    aminoType: "cosmos-sdk/QueryDelegatorUnbondingDelegationsRequest";
    is(o: any): o is QueryDelegatorUnbondingDelegationsRequest;
    isSDK(o: any): o is QueryDelegatorUnbondingDelegationsRequestSDKType;
    encode(message: QueryDelegatorUnbondingDelegationsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorUnbondingDelegationsRequest;
    fromJSON(object: any): QueryDelegatorUnbondingDelegationsRequest;
    toJSON(message: QueryDelegatorUnbondingDelegationsRequest): JsonSafe<QueryDelegatorUnbondingDelegationsRequest>;
    fromPartial(object: Partial<QueryDelegatorUnbondingDelegationsRequest>): QueryDelegatorUnbondingDelegationsRequest;
    fromProtoMsg(message: QueryDelegatorUnbondingDelegationsRequestProtoMsg): QueryDelegatorUnbondingDelegationsRequest;
    toProto(message: QueryDelegatorUnbondingDelegationsRequest): Uint8Array;
    toProtoMsg(message: QueryDelegatorUnbondingDelegationsRequest): QueryDelegatorUnbondingDelegationsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUnbondingDelegatorDelegationsResponse is response type for the
 * Query/UnbondingDelegatorDelegations RPC method.
 * @name QueryDelegatorUnbondingDelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsResponse
 */
export declare const QueryDelegatorUnbondingDelegationsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorUnbondingDelegationsResponse";
    aminoType: "cosmos-sdk/QueryDelegatorUnbondingDelegationsResponse";
    is(o: any): o is QueryDelegatorUnbondingDelegationsResponse;
    isSDK(o: any): o is QueryDelegatorUnbondingDelegationsResponseSDKType;
    encode(message: QueryDelegatorUnbondingDelegationsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorUnbondingDelegationsResponse;
    fromJSON(object: any): QueryDelegatorUnbondingDelegationsResponse;
    toJSON(message: QueryDelegatorUnbondingDelegationsResponse): JsonSafe<QueryDelegatorUnbondingDelegationsResponse>;
    fromPartial(object: Partial<QueryDelegatorUnbondingDelegationsResponse>): QueryDelegatorUnbondingDelegationsResponse;
    fromProtoMsg(message: QueryDelegatorUnbondingDelegationsResponseProtoMsg): QueryDelegatorUnbondingDelegationsResponse;
    toProto(message: QueryDelegatorUnbondingDelegationsResponse): Uint8Array;
    toProtoMsg(message: QueryDelegatorUnbondingDelegationsResponse): QueryDelegatorUnbondingDelegationsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRedelegationsRequest is request type for the Query/Redelegations RPC
 * method.
 * @name QueryRedelegationsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryRedelegationsRequest
 */
export declare const QueryRedelegationsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryRedelegationsRequest";
    aminoType: "cosmos-sdk/QueryRedelegationsRequest";
    is(o: any): o is QueryRedelegationsRequest;
    isSDK(o: any): o is QueryRedelegationsRequestSDKType;
    encode(message: QueryRedelegationsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRedelegationsRequest;
    fromJSON(object: any): QueryRedelegationsRequest;
    toJSON(message: QueryRedelegationsRequest): JsonSafe<QueryRedelegationsRequest>;
    fromPartial(object: Partial<QueryRedelegationsRequest>): QueryRedelegationsRequest;
    fromProtoMsg(message: QueryRedelegationsRequestProtoMsg): QueryRedelegationsRequest;
    toProto(message: QueryRedelegationsRequest): Uint8Array;
    toProtoMsg(message: QueryRedelegationsRequest): QueryRedelegationsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRedelegationsResponse is response type for the Query/Redelegations RPC
 * method.
 * @name QueryRedelegationsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryRedelegationsResponse
 */
export declare const QueryRedelegationsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryRedelegationsResponse";
    aminoType: "cosmos-sdk/QueryRedelegationsResponse";
    is(o: any): o is QueryRedelegationsResponse;
    isSDK(o: any): o is QueryRedelegationsResponseSDKType;
    encode(message: QueryRedelegationsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRedelegationsResponse;
    fromJSON(object: any): QueryRedelegationsResponse;
    toJSON(message: QueryRedelegationsResponse): JsonSafe<QueryRedelegationsResponse>;
    fromPartial(object: Partial<QueryRedelegationsResponse>): QueryRedelegationsResponse;
    fromProtoMsg(message: QueryRedelegationsResponseProtoMsg): QueryRedelegationsResponse;
    toProto(message: QueryRedelegationsResponse): Uint8Array;
    toProtoMsg(message: QueryRedelegationsResponse): QueryRedelegationsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorValidatorsRequest is request type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorsRequest
 */
export declare const QueryDelegatorValidatorsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorValidatorsRequest";
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
 * QueryDelegatorValidatorsResponse is response type for the
 * Query/DelegatorValidators RPC method.
 * @name QueryDelegatorValidatorsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorsResponse
 */
export declare const QueryDelegatorValidatorsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorValidatorsResponse";
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
 * QueryDelegatorValidatorRequest is request type for the
 * Query/DelegatorValidator RPC method.
 * @name QueryDelegatorValidatorRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorRequest
 */
export declare const QueryDelegatorValidatorRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorValidatorRequest";
    aminoType: "cosmos-sdk/QueryDelegatorValidatorRequest";
    is(o: any): o is QueryDelegatorValidatorRequest;
    isSDK(o: any): o is QueryDelegatorValidatorRequestSDKType;
    encode(message: QueryDelegatorValidatorRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorValidatorRequest;
    fromJSON(object: any): QueryDelegatorValidatorRequest;
    toJSON(message: QueryDelegatorValidatorRequest): JsonSafe<QueryDelegatorValidatorRequest>;
    fromPartial(object: Partial<QueryDelegatorValidatorRequest>): QueryDelegatorValidatorRequest;
    fromProtoMsg(message: QueryDelegatorValidatorRequestProtoMsg): QueryDelegatorValidatorRequest;
    toProto(message: QueryDelegatorValidatorRequest): Uint8Array;
    toProtoMsg(message: QueryDelegatorValidatorRequest): QueryDelegatorValidatorRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDelegatorValidatorResponse response type for the
 * Query/DelegatorValidator RPC method.
 * @name QueryDelegatorValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryDelegatorValidatorResponse
 */
export declare const QueryDelegatorValidatorResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryDelegatorValidatorResponse";
    aminoType: "cosmos-sdk/QueryDelegatorValidatorResponse";
    is(o: any): o is QueryDelegatorValidatorResponse;
    isSDK(o: any): o is QueryDelegatorValidatorResponseSDKType;
    encode(message: QueryDelegatorValidatorResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegatorValidatorResponse;
    fromJSON(object: any): QueryDelegatorValidatorResponse;
    toJSON(message: QueryDelegatorValidatorResponse): JsonSafe<QueryDelegatorValidatorResponse>;
    fromPartial(object: Partial<QueryDelegatorValidatorResponse>): QueryDelegatorValidatorResponse;
    fromProtoMsg(message: QueryDelegatorValidatorResponseProtoMsg): QueryDelegatorValidatorResponse;
    toProto(message: QueryDelegatorValidatorResponse): Uint8Array;
    toProtoMsg(message: QueryDelegatorValidatorResponse): QueryDelegatorValidatorResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryHistoricalInfoRequest is request type for the Query/HistoricalInfo RPC
 * method.
 * @name QueryHistoricalInfoRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryHistoricalInfoRequest
 */
export declare const QueryHistoricalInfoRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryHistoricalInfoRequest";
    aminoType: "cosmos-sdk/QueryHistoricalInfoRequest";
    is(o: any): o is QueryHistoricalInfoRequest;
    isSDK(o: any): o is QueryHistoricalInfoRequestSDKType;
    encode(message: QueryHistoricalInfoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryHistoricalInfoRequest;
    fromJSON(object: any): QueryHistoricalInfoRequest;
    toJSON(message: QueryHistoricalInfoRequest): JsonSafe<QueryHistoricalInfoRequest>;
    fromPartial(object: Partial<QueryHistoricalInfoRequest>): QueryHistoricalInfoRequest;
    fromProtoMsg(message: QueryHistoricalInfoRequestProtoMsg): QueryHistoricalInfoRequest;
    toProto(message: QueryHistoricalInfoRequest): Uint8Array;
    toProtoMsg(message: QueryHistoricalInfoRequest): QueryHistoricalInfoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryHistoricalInfoResponse is response type for the Query/HistoricalInfo RPC
 * method.
 * @name QueryHistoricalInfoResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryHistoricalInfoResponse
 */
export declare const QueryHistoricalInfoResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryHistoricalInfoResponse";
    aminoType: "cosmos-sdk/QueryHistoricalInfoResponse";
    is(o: any): o is QueryHistoricalInfoResponse;
    isSDK(o: any): o is QueryHistoricalInfoResponseSDKType;
    encode(message: QueryHistoricalInfoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryHistoricalInfoResponse;
    fromJSON(object: any): QueryHistoricalInfoResponse;
    toJSON(message: QueryHistoricalInfoResponse): JsonSafe<QueryHistoricalInfoResponse>;
    fromPartial(object: Partial<QueryHistoricalInfoResponse>): QueryHistoricalInfoResponse;
    fromProtoMsg(message: QueryHistoricalInfoResponseProtoMsg): QueryHistoricalInfoResponse;
    toProto(message: QueryHistoricalInfoResponse): Uint8Array;
    toProtoMsg(message: QueryHistoricalInfoResponse): QueryHistoricalInfoResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPoolRequest is request type for the Query/Pool RPC method.
 * @name QueryPoolRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryPoolRequest
 */
export declare const QueryPoolRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryPoolRequest";
    aminoType: "cosmos-sdk/QueryPoolRequest";
    is(o: any): o is QueryPoolRequest;
    isSDK(o: any): o is QueryPoolRequestSDKType;
    encode(_: QueryPoolRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPoolRequest;
    fromJSON(_: any): QueryPoolRequest;
    toJSON(_: QueryPoolRequest): JsonSafe<QueryPoolRequest>;
    fromPartial(_: Partial<QueryPoolRequest>): QueryPoolRequest;
    fromProtoMsg(message: QueryPoolRequestProtoMsg): QueryPoolRequest;
    toProto(message: QueryPoolRequest): Uint8Array;
    toProtoMsg(message: QueryPoolRequest): QueryPoolRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPoolResponse is response type for the Query/Pool RPC method.
 * @name QueryPoolResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryPoolResponse
 */
export declare const QueryPoolResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryPoolResponse";
    aminoType: "cosmos-sdk/QueryPoolResponse";
    is(o: any): o is QueryPoolResponse;
    isSDK(o: any): o is QueryPoolResponseSDKType;
    encode(message: QueryPoolResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPoolResponse;
    fromJSON(object: any): QueryPoolResponse;
    toJSON(message: QueryPoolResponse): JsonSafe<QueryPoolResponse>;
    fromPartial(object: Partial<QueryPoolResponse>): QueryPoolResponse;
    fromProtoMsg(message: QueryPoolResponseProtoMsg): QueryPoolResponse;
    toProto(message: QueryPoolResponse): Uint8Array;
    toProtoMsg(message: QueryPoolResponse): QueryPoolResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.staking.v1beta1.QueryParamsRequest";
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
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.QueryParamsResponse";
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
//# sourceMappingURL=query.d.ts.map