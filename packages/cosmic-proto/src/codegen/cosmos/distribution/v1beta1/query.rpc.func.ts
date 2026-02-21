//@ts-nocheck
import { buildQuery } from '../../../helper-func-types.js';
import {
  QueryParamsRequest,
  QueryParamsResponse,
  QueryValidatorDistributionInfoRequest,
  QueryValidatorDistributionInfoResponse,
  QueryValidatorOutstandingRewardsRequest,
  QueryValidatorOutstandingRewardsResponse,
  QueryValidatorCommissionRequest,
  QueryValidatorCommissionResponse,
  QueryValidatorSlashesRequest,
  QueryValidatorSlashesResponse,
  QueryDelegationRewardsRequest,
  QueryDelegationRewardsResponse,
  QueryDelegationTotalRewardsRequest,
  QueryDelegationTotalRewardsResponse,
  QueryDelegatorValidatorsRequest,
  QueryDelegatorValidatorsResponse,
  QueryDelegatorWithdrawAddressRequest,
  QueryDelegatorWithdrawAddressResponse,
  QueryCommunityPoolRequest,
  QueryCommunityPoolResponse,
} from './query.js';
/**
 * Params queries params of the distribution module.
 * @name getParams
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'Params',
  deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * ValidatorDistributionInfo queries validator commission and self-delegation rewards for validator
 * @name getValidatorDistributionInfo
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorDistributionInfo
 */
export const getValidatorDistributionInfo = buildQuery<
  QueryValidatorDistributionInfoRequest,
  QueryValidatorDistributionInfoResponse
>({
  encode: QueryValidatorDistributionInfoRequest.encode,
  decode: QueryValidatorDistributionInfoResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'ValidatorDistributionInfo',
  deps: [
    QueryValidatorDistributionInfoRequest,
    QueryValidatorDistributionInfoResponse,
  ],
});
/**
 * ValidatorOutstandingRewards queries rewards of a validator address.
 * @name getValidatorOutstandingRewards
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorOutstandingRewards
 */
export const getValidatorOutstandingRewards = buildQuery<
  QueryValidatorOutstandingRewardsRequest,
  QueryValidatorOutstandingRewardsResponse
>({
  encode: QueryValidatorOutstandingRewardsRequest.encode,
  decode: QueryValidatorOutstandingRewardsResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'ValidatorOutstandingRewards',
  deps: [
    QueryValidatorOutstandingRewardsRequest,
    QueryValidatorOutstandingRewardsResponse,
  ],
});
/**
 * ValidatorCommission queries accumulated commission for a validator.
 * @name getValidatorCommission
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorCommission
 */
export const getValidatorCommission = buildQuery<
  QueryValidatorCommissionRequest,
  QueryValidatorCommissionResponse
>({
  encode: QueryValidatorCommissionRequest.encode,
  decode: QueryValidatorCommissionResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'ValidatorCommission',
  deps: [QueryValidatorCommissionRequest, QueryValidatorCommissionResponse],
});
/**
 * ValidatorSlashes queries slash events of a validator.
 * @name getValidatorSlashes
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorSlashes
 */
export const getValidatorSlashes = buildQuery<
  QueryValidatorSlashesRequest,
  QueryValidatorSlashesResponse
>({
  encode: QueryValidatorSlashesRequest.encode,
  decode: QueryValidatorSlashesResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'ValidatorSlashes',
  deps: [QueryValidatorSlashesRequest, QueryValidatorSlashesResponse],
});
/**
 * DelegationRewards queries the total rewards accrued by a delegation.
 * @name getDelegationRewards
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegationRewards
 */
export const getDelegationRewards = buildQuery<
  QueryDelegationRewardsRequest,
  QueryDelegationRewardsResponse
>({
  encode: QueryDelegationRewardsRequest.encode,
  decode: QueryDelegationRewardsResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'DelegationRewards',
  deps: [QueryDelegationRewardsRequest, QueryDelegationRewardsResponse],
});
/**
 * DelegationTotalRewards queries the total rewards accrued by each
 * validator.
 * @name getDelegationTotalRewards
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegationTotalRewards
 */
export const getDelegationTotalRewards = buildQuery<
  QueryDelegationTotalRewardsRequest,
  QueryDelegationTotalRewardsResponse
>({
  encode: QueryDelegationTotalRewardsRequest.encode,
  decode: QueryDelegationTotalRewardsResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'DelegationTotalRewards',
  deps: [
    QueryDelegationTotalRewardsRequest,
    QueryDelegationTotalRewardsResponse,
  ],
});
/**
 * DelegatorValidators queries the validators of a delegator.
 * @name getDelegatorValidators
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegatorValidators
 */
export const getDelegatorValidators = buildQuery<
  QueryDelegatorValidatorsRequest,
  QueryDelegatorValidatorsResponse
>({
  encode: QueryDelegatorValidatorsRequest.encode,
  decode: QueryDelegatorValidatorsResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'DelegatorValidators',
  deps: [QueryDelegatorValidatorsRequest, QueryDelegatorValidatorsResponse],
});
/**
 * DelegatorWithdrawAddress queries withdraw address of a delegator.
 * @name getDelegatorWithdrawAddress
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegatorWithdrawAddress
 */
export const getDelegatorWithdrawAddress = buildQuery<
  QueryDelegatorWithdrawAddressRequest,
  QueryDelegatorWithdrawAddressResponse
>({
  encode: QueryDelegatorWithdrawAddressRequest.encode,
  decode: QueryDelegatorWithdrawAddressResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'DelegatorWithdrawAddress',
  deps: [
    QueryDelegatorWithdrawAddressRequest,
    QueryDelegatorWithdrawAddressResponse,
  ],
});
/**
 * CommunityPool queries the community pool coins.
 * @name getCommunityPool
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.CommunityPool
 */
export const getCommunityPool = buildQuery<
  QueryCommunityPoolRequest,
  QueryCommunityPoolResponse
>({
  encode: QueryCommunityPoolRequest.encode,
  decode: QueryCommunityPoolResponse.decode,
  service: 'cosmos.distribution.v1beta1.Query',
  method: 'CommunityPool',
  deps: [QueryCommunityPoolRequest, QueryCommunityPoolResponse],
});
