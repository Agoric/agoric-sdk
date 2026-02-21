//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryCurrentPlanRequest, QueryCurrentPlanResponse, QueryAppliedPlanRequest, QueryAppliedPlanResponse, QueryUpgradedConsensusStateRequest, QueryUpgradedConsensusStateResponse, QueryModuleVersionsRequest, QueryModuleVersionsResponse, QueryAuthorityRequest, QueryAuthorityResponse, } from '@agoric/cosmic-proto/codegen/cosmos/upgrade/v1beta1/query.js';
/**
 * CurrentPlan queries the current upgrade plan.
 * @name getCurrentPlan
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.CurrentPlan
 */
export const getCurrentPlan = buildQuery({
    encode: QueryCurrentPlanRequest.encode,
    decode: QueryCurrentPlanResponse.decode,
    service: 'cosmos.upgrade.v1beta1.Query',
    method: 'CurrentPlan',
    deps: [QueryCurrentPlanRequest, QueryCurrentPlanResponse],
});
/**
 * AppliedPlan queries a previously applied upgrade plan by its name.
 * @name getAppliedPlan
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.AppliedPlan
 */
export const getAppliedPlan = buildQuery({
    encode: QueryAppliedPlanRequest.encode,
    decode: QueryAppliedPlanResponse.decode,
    service: 'cosmos.upgrade.v1beta1.Query',
    method: 'AppliedPlan',
    deps: [QueryAppliedPlanRequest, QueryAppliedPlanResponse],
});
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
export const getUpgradedConsensusState = buildQuery({
    encode: QueryUpgradedConsensusStateRequest.encode,
    decode: QueryUpgradedConsensusStateResponse.decode,
    service: 'cosmos.upgrade.v1beta1.Query',
    method: 'UpgradedConsensusState',
    deps: [
        QueryUpgradedConsensusStateRequest,
        QueryUpgradedConsensusStateResponse,
    ],
});
/**
 * ModuleVersions queries the list of module versions from state.
 *
 * Since: cosmos-sdk 0.43
 * @name getModuleVersions
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.ModuleVersions
 */
export const getModuleVersions = buildQuery({
    encode: QueryModuleVersionsRequest.encode,
    decode: QueryModuleVersionsResponse.decode,
    service: 'cosmos.upgrade.v1beta1.Query',
    method: 'ModuleVersions',
    deps: [QueryModuleVersionsRequest, QueryModuleVersionsResponse],
});
/**
 * Returns the account with authority to conduct upgrades
 *
 * Since: cosmos-sdk 0.46
 * @name getAuthority
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.Authority
 */
export const getAuthority = buildQuery({
    encode: QueryAuthorityRequest.encode,
    decode: QueryAuthorityResponse.decode,
    service: 'cosmos.upgrade.v1beta1.Query',
    method: 'Authority',
    deps: [QueryAuthorityRequest, QueryAuthorityResponse],
});
//# sourceMappingURL=query.rpc.func.js.map