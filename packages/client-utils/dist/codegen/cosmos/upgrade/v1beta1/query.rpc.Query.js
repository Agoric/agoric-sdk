import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryCurrentPlanRequest, QueryCurrentPlanResponse, QueryAppliedPlanRequest, QueryAppliedPlanResponse, QueryUpgradedConsensusStateRequest, QueryUpgradedConsensusStateResponse, QueryModuleVersionsRequest, QueryModuleVersionsResponse, QueryAuthorityRequest, QueryAuthorityResponse, } from '@agoric/cosmic-proto/codegen/cosmos/upgrade/v1beta1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.currentPlan = this.currentPlan.bind(this);
        this.appliedPlan = this.appliedPlan.bind(this);
        this.upgradedConsensusState = this.upgradedConsensusState.bind(this);
        this.moduleVersions = this.moduleVersions.bind(this);
        this.authority = this.authority.bind(this);
    }
    currentPlan(request = {}) {
        const data = QueryCurrentPlanRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Query', 'CurrentPlan', data);
        return promise.then(data => QueryCurrentPlanResponse.decode(new BinaryReader(data)));
    }
    appliedPlan(request) {
        const data = QueryAppliedPlanRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Query', 'AppliedPlan', data);
        return promise.then(data => QueryAppliedPlanResponse.decode(new BinaryReader(data)));
    }
    upgradedConsensusState(request) {
        const data = QueryUpgradedConsensusStateRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Query', 'UpgradedConsensusState', data);
        return promise.then(data => QueryUpgradedConsensusStateResponse.decode(new BinaryReader(data)));
    }
    moduleVersions(request) {
        const data = QueryModuleVersionsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Query', 'ModuleVersions', data);
        return promise.then(data => QueryModuleVersionsResponse.decode(new BinaryReader(data)));
    }
    authority(request = {}) {
        const data = QueryAuthorityRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Query', 'Authority', data);
        return promise.then(data => QueryAuthorityResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        currentPlan(request) {
            return queryService.currentPlan(request);
        },
        appliedPlan(request) {
            return queryService.appliedPlan(request);
        },
        upgradedConsensusState(request) {
            return queryService.upgradedConsensusState(request);
        },
        moduleVersions(request) {
            return queryService.moduleVersions(request);
        },
        authority(request) {
            return queryService.authority(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map