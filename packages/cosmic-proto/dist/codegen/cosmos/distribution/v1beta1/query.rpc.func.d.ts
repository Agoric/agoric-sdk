import { QueryParamsRequest, QueryParamsResponse, QueryValidatorDistributionInfoRequest, QueryValidatorDistributionInfoResponse, QueryValidatorOutstandingRewardsRequest, QueryValidatorOutstandingRewardsResponse, QueryValidatorCommissionRequest, QueryValidatorCommissionResponse, QueryValidatorSlashesRequest, QueryValidatorSlashesResponse, QueryDelegationRewardsRequest, QueryDelegationRewardsResponse, QueryDelegationTotalRewardsRequest, QueryDelegationTotalRewardsResponse, QueryDelegatorValidatorsRequest, QueryDelegatorValidatorsResponse, QueryDelegatorWithdrawAddressRequest, QueryDelegatorWithdrawAddressResponse, QueryCommunityPoolRequest, QueryCommunityPoolResponse } from './query.js';
/**
 * Params queries params of the distribution module.
 * @name getParams
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.Params
 */
export declare const getParams: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * ValidatorDistributionInfo queries validator commission and self-delegation rewards for validator
 * @name getValidatorDistributionInfo
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorDistributionInfo
 */
export declare const getValidatorDistributionInfo: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryValidatorDistributionInfoRequest) => Promise<QueryValidatorDistributionInfoResponse>;
/**
 * ValidatorOutstandingRewards queries rewards of a validator address.
 * @name getValidatorOutstandingRewards
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorOutstandingRewards
 */
export declare const getValidatorOutstandingRewards: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryValidatorOutstandingRewardsRequest) => Promise<QueryValidatorOutstandingRewardsResponse>;
/**
 * ValidatorCommission queries accumulated commission for a validator.
 * @name getValidatorCommission
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorCommission
 */
export declare const getValidatorCommission: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryValidatorCommissionRequest) => Promise<QueryValidatorCommissionResponse>;
/**
 * ValidatorSlashes queries slash events of a validator.
 * @name getValidatorSlashes
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.ValidatorSlashes
 */
export declare const getValidatorSlashes: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryValidatorSlashesRequest) => Promise<QueryValidatorSlashesResponse>;
/**
 * DelegationRewards queries the total rewards accrued by a delegation.
 * @name getDelegationRewards
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegationRewards
 */
export declare const getDelegationRewards: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryDelegationRewardsRequest) => Promise<QueryDelegationRewardsResponse>;
/**
 * DelegationTotalRewards queries the total rewards accrued by each
 * validator.
 * @name getDelegationTotalRewards
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegationTotalRewards
 */
export declare const getDelegationTotalRewards: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryDelegationTotalRewardsRequest) => Promise<QueryDelegationTotalRewardsResponse>;
/**
 * DelegatorValidators queries the validators of a delegator.
 * @name getDelegatorValidators
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegatorValidators
 */
export declare const getDelegatorValidators: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryDelegatorValidatorsRequest) => Promise<QueryDelegatorValidatorsResponse>;
/**
 * DelegatorWithdrawAddress queries withdraw address of a delegator.
 * @name getDelegatorWithdrawAddress
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DelegatorWithdrawAddress
 */
export declare const getDelegatorWithdrawAddress: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryDelegatorWithdrawAddressRequest) => Promise<QueryDelegatorWithdrawAddressResponse>;
/**
 * CommunityPool queries the community pool coins.
 * @name getCommunityPool
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.CommunityPool
 */
export declare const getCommunityPool: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryCommunityPoolRequest) => Promise<QueryCommunityPoolResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map