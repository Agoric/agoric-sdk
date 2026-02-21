import { QueryValidatorsRequest, QueryValidatorsResponse, QueryValidatorRequest, QueryValidatorResponse, QueryValidatorDelegationsRequest, QueryValidatorDelegationsResponse, QueryValidatorUnbondingDelegationsRequest, QueryValidatorUnbondingDelegationsResponse, QueryDelegationRequest, QueryDelegationResponse, QueryUnbondingDelegationRequest, QueryUnbondingDelegationResponse, QueryDelegatorDelegationsRequest, QueryDelegatorDelegationsResponse, QueryDelegatorUnbondingDelegationsRequest, QueryDelegatorUnbondingDelegationsResponse, QueryRedelegationsRequest, QueryRedelegationsResponse, QueryDelegatorValidatorsRequest, QueryDelegatorValidatorsResponse, QueryDelegatorValidatorRequest, QueryDelegatorValidatorResponse, QueryHistoricalInfoRequest, QueryHistoricalInfoResponse, QueryPoolRequest, QueryPoolResponse, QueryParamsRequest, QueryParamsResponse } from '@agoric/cosmic-proto/codegen/cosmos/staking/v1beta1/query.js';
/**
 * Validators queries all validators that match the given status.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getValidators
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Validators
 */
export declare const getValidators: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryValidatorsRequest) => Promise<QueryValidatorsResponse>;
/**
 * Validator queries validator info for given validator address.
 * @name getValidator
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Validator
 */
export declare const getValidator: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryValidatorRequest) => Promise<QueryValidatorResponse>;
/**
 * ValidatorDelegations queries delegate info for given validator.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getValidatorDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.ValidatorDelegations
 */
export declare const getValidatorDelegations: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryValidatorDelegationsRequest) => Promise<QueryValidatorDelegationsResponse>;
/**
 * ValidatorUnbondingDelegations queries unbonding delegations of a validator.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getValidatorUnbondingDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.ValidatorUnbondingDelegations
 */
export declare const getValidatorUnbondingDelegations: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryValidatorUnbondingDelegationsRequest) => Promise<QueryValidatorUnbondingDelegationsResponse>;
/**
 * Delegation queries delegate info for given validator delegator pair.
 * @name getDelegation
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Delegation
 */
export declare const getDelegation: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDelegationRequest) => Promise<QueryDelegationResponse>;
/**
 * UnbondingDelegation queries unbonding info for given validator delegator
 * pair.
 * @name getUnbondingDelegation
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.UnbondingDelegation
 */
export declare const getUnbondingDelegation: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryUnbondingDelegationRequest) => Promise<QueryUnbondingDelegationResponse>;
/**
 * DelegatorDelegations queries all delegations of a given delegator address.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getDelegatorDelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.DelegatorDelegations
 */
export declare const getDelegatorDelegations: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDelegatorDelegationsRequest) => Promise<QueryDelegatorDelegationsResponse>;
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
export declare const getDelegatorUnbondingDelegations: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDelegatorUnbondingDelegationsRequest) => Promise<QueryDelegatorUnbondingDelegationsResponse>;
/**
 * Redelegations queries redelegations of given address.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getRedelegations
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Redelegations
 */
export declare const getRedelegations: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryRedelegationsRequest) => Promise<QueryRedelegationsResponse>;
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
export declare const getDelegatorValidators: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDelegatorValidatorsRequest) => Promise<QueryDelegatorValidatorsResponse>;
/**
 * DelegatorValidator queries validator info for given delegator validator
 * pair.
 * @name getDelegatorValidator
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.DelegatorValidator
 */
export declare const getDelegatorValidator: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDelegatorValidatorRequest) => Promise<QueryDelegatorValidatorResponse>;
/**
 * HistoricalInfo queries the historical info for given height.
 * @name getHistoricalInfo
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.HistoricalInfo
 */
export declare const getHistoricalInfo: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryHistoricalInfoRequest) => Promise<QueryHistoricalInfoResponse>;
/**
 * Pool queries the pool info.
 * @name getPool
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Pool
 */
export declare const getPool: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryPoolRequest) => Promise<QueryPoolResponse>;
/**
 * Parameters queries the staking parameters.
 * @name getParams
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map