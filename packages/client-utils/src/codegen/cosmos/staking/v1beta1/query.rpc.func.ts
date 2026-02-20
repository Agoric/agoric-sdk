//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryValidatorsRequest,
  QueryValidatorsResponse,
  QueryValidatorRequest,
  QueryValidatorResponse,
  QueryValidatorDelegationsRequest,
  QueryValidatorDelegationsResponse,
  QueryValidatorUnbondingDelegationsRequest,
  QueryValidatorUnbondingDelegationsResponse,
  QueryDelegationRequest,
  QueryDelegationResponse,
  QueryUnbondingDelegationRequest,
  QueryUnbondingDelegationResponse,
  QueryDelegatorDelegationsRequest,
  QueryDelegatorDelegationsResponse,
  QueryDelegatorUnbondingDelegationsRequest,
  QueryDelegatorUnbondingDelegationsResponse,
  QueryRedelegationsRequest,
  QueryRedelegationsResponse,
  QueryDelegatorValidatorsRequest,
  QueryDelegatorValidatorsResponse,
  QueryDelegatorValidatorRequest,
  QueryDelegatorValidatorResponse,
  QueryHistoricalInfoRequest,
  QueryHistoricalInfoResponse,
  QueryPoolRequest,
  QueryPoolResponse,
  QueryParamsRequest,
  QueryParamsResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/staking/v1beta1/query.js';
/**
 * Validators queries all validators that match the given status.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getValidators
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Validators
 */
export const getValidators = buildQuery<
  QueryValidatorsRequest,
  QueryValidatorsResponse
>({
  encode: QueryValidatorsRequest.encode,
  decode: QueryValidatorsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'Validators',
  deps: [QueryValidatorsRequest, QueryValidatorsResponse],
});
/**
 * Validator queries validator info for given validator address.
 * @name getValidator
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Validator
 */
export const getValidator = buildQuery<
  QueryValidatorRequest,
  QueryValidatorResponse
>({
  encode: QueryValidatorRequest.encode,
  decode: QueryValidatorResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'Validator',
  deps: [QueryValidatorRequest, QueryValidatorResponse],
});
/**
 * ValidatorDelegations queries delegate info for given validator.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getValidatorDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.ValidatorDelegations
 */
export const getValidatorDelegations = buildQuery<
  QueryValidatorDelegationsRequest,
  QueryValidatorDelegationsResponse
>({
  encode: QueryValidatorDelegationsRequest.encode,
  decode: QueryValidatorDelegationsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'ValidatorDelegations',
  deps: [QueryValidatorDelegationsRequest, QueryValidatorDelegationsResponse],
});
/**
 * ValidatorUnbondingDelegations queries unbonding delegations of a validator.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getValidatorUnbondingDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.ValidatorUnbondingDelegations
 */
export const getValidatorUnbondingDelegations = buildQuery<
  QueryValidatorUnbondingDelegationsRequest,
  QueryValidatorUnbondingDelegationsResponse
>({
  encode: QueryValidatorUnbondingDelegationsRequest.encode,
  decode: QueryValidatorUnbondingDelegationsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'ValidatorUnbondingDelegations',
  deps: [
    QueryValidatorUnbondingDelegationsRequest,
    QueryValidatorUnbondingDelegationsResponse,
  ],
});
/**
 * Delegation queries delegate info for given validator delegator pair.
 * @name getDelegation
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Delegation
 */
export const getDelegation = buildQuery<
  QueryDelegationRequest,
  QueryDelegationResponse
>({
  encode: QueryDelegationRequest.encode,
  decode: QueryDelegationResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'Delegation',
  deps: [QueryDelegationRequest, QueryDelegationResponse],
});
/**
 * UnbondingDelegation queries unbonding info for given validator delegator
 * pair.
 * @name getUnbondingDelegation
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.UnbondingDelegation
 */
export const getUnbondingDelegation = buildQuery<
  QueryUnbondingDelegationRequest,
  QueryUnbondingDelegationResponse
>({
  encode: QueryUnbondingDelegationRequest.encode,
  decode: QueryUnbondingDelegationResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'UnbondingDelegation',
  deps: [QueryUnbondingDelegationRequest, QueryUnbondingDelegationResponse],
});
/**
 * DelegatorDelegations queries all delegations of a given delegator address.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getDelegatorDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.DelegatorDelegations
 */
export const getDelegatorDelegations = buildQuery<
  QueryDelegatorDelegationsRequest,
  QueryDelegatorDelegationsResponse
>({
  encode: QueryDelegatorDelegationsRequest.encode,
  decode: QueryDelegatorDelegationsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'DelegatorDelegations',
  deps: [QueryDelegatorDelegationsRequest, QueryDelegatorDelegationsResponse],
});
/**
 * DelegatorUnbondingDelegations queries all unbonding delegations of a given
 * delegator address.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getDelegatorUnbondingDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.DelegatorUnbondingDelegations
 */
export const getDelegatorUnbondingDelegations = buildQuery<
  QueryDelegatorUnbondingDelegationsRequest,
  QueryDelegatorUnbondingDelegationsResponse
>({
  encode: QueryDelegatorUnbondingDelegationsRequest.encode,
  decode: QueryDelegatorUnbondingDelegationsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'DelegatorUnbondingDelegations',
  deps: [
    QueryDelegatorUnbondingDelegationsRequest,
    QueryDelegatorUnbondingDelegationsResponse,
  ],
});
/**
 * Redelegations queries redelegations of given address.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getRedelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Redelegations
 */
export const getRedelegations = buildQuery<
  QueryRedelegationsRequest,
  QueryRedelegationsResponse
>({
  encode: QueryRedelegationsRequest.encode,
  decode: QueryRedelegationsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'Redelegations',
  deps: [QueryRedelegationsRequest, QueryRedelegationsResponse],
});
/**
 * DelegatorValidators queries all validators info for given delegator
 * address.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getDelegatorValidators
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.DelegatorValidators
 */
export const getDelegatorValidators = buildQuery<
  QueryDelegatorValidatorsRequest,
  QueryDelegatorValidatorsResponse
>({
  encode: QueryDelegatorValidatorsRequest.encode,
  decode: QueryDelegatorValidatorsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'DelegatorValidators',
  deps: [QueryDelegatorValidatorsRequest, QueryDelegatorValidatorsResponse],
});
/**
 * DelegatorValidator queries validator info for given delegator validator
 * pair.
 * @name getDelegatorValidator
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.DelegatorValidator
 */
export const getDelegatorValidator = buildQuery<
  QueryDelegatorValidatorRequest,
  QueryDelegatorValidatorResponse
>({
  encode: QueryDelegatorValidatorRequest.encode,
  decode: QueryDelegatorValidatorResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'DelegatorValidator',
  deps: [QueryDelegatorValidatorRequest, QueryDelegatorValidatorResponse],
});
/**
 * HistoricalInfo queries the historical info for given height.
 * @name getHistoricalInfo
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.HistoricalInfo
 */
export const getHistoricalInfo = buildQuery<
  QueryHistoricalInfoRequest,
  QueryHistoricalInfoResponse
>({
  encode: QueryHistoricalInfoRequest.encode,
  decode: QueryHistoricalInfoResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'HistoricalInfo',
  deps: [QueryHistoricalInfoRequest, QueryHistoricalInfoResponse],
});
/**
 * Pool queries the pool info.
 * @name getPool
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Pool
 */
export const getPool = buildQuery<QueryPoolRequest, QueryPoolResponse>({
  encode: QueryPoolRequest.encode,
  decode: QueryPoolResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'Pool',
  deps: [QueryPoolRequest, QueryPoolResponse],
});
/**
 * Parameters queries the staking parameters.
 * @name getParams
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'cosmos.staking.v1beta1.Query',
  method: 'Params',
  deps: [QueryParamsRequest, QueryParamsResponse],
});
