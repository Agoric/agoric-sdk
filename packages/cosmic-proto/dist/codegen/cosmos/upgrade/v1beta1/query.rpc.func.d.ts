import { QueryCurrentPlanRequest, QueryCurrentPlanResponse, QueryAppliedPlanRequest, QueryAppliedPlanResponse, QueryUpgradedConsensusStateRequest, QueryUpgradedConsensusStateResponse, QueryModuleVersionsRequest, QueryModuleVersionsResponse, QueryAuthorityRequest, QueryAuthorityResponse } from './query.js';
/**
 * CurrentPlan queries the current upgrade plan.
 * @name getCurrentPlan
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.CurrentPlan
 */
export declare const getCurrentPlan: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryCurrentPlanRequest) => Promise<QueryCurrentPlanResponse>;
/**
 * AppliedPlan queries a previously applied upgrade plan by its name.
 * @name getAppliedPlan
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.AppliedPlan
 */
export declare const getAppliedPlan: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAppliedPlanRequest) => Promise<QueryAppliedPlanResponse>;
/**
 * UpgradedConsensusState queries the consensus state that will serve
 * as a trusted kernel for the next version of this chain. It will only be
 * stored at the last height of this chain.
 * UpgradedConsensusState RPC not supported with legacy querier
 * This rpc is deprecated now that IBC has its own replacement
 * (https://github.com/cosmos/ibc-go/blob/2c880a22e9f9cc75f62b527ca94aa75ce1106001/proto/ibc/core/client/v1/query.proto#L54)
 * @name getUpgradedConsensusState
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.UpgradedConsensusState
 * @deprecated
 */
export declare const getUpgradedConsensusState: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryUpgradedConsensusStateRequest) => Promise<QueryUpgradedConsensusStateResponse>;
/**
 * ModuleVersions queries the list of module versions from state.
 *
 * Since: cosmos-sdk 0.43
 * @name getModuleVersions
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.ModuleVersions
 */
export declare const getModuleVersions: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryModuleVersionsRequest) => Promise<QueryModuleVersionsResponse>;
/**
 * Returns the account with authority to conduct upgrades
 *
 * Since: cosmos-sdk 0.46
 * @name getAuthority
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.Authority
 */
export declare const getAuthority: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAuthorityRequest) => Promise<QueryAuthorityResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map