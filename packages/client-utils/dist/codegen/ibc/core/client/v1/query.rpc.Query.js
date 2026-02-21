import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryClientStateRequest, QueryClientStateResponse, QueryClientStatesRequest, QueryClientStatesResponse, QueryConsensusStateRequest, QueryConsensusStateResponse, QueryConsensusStatesRequest, QueryConsensusStatesResponse, QueryConsensusStateHeightsRequest, QueryConsensusStateHeightsResponse, QueryClientStatusRequest, QueryClientStatusResponse, QueryClientParamsRequest, QueryClientParamsResponse, QueryUpgradedClientStateRequest, QueryUpgradedClientStateResponse, QueryUpgradedConsensusStateRequest, QueryUpgradedConsensusStateResponse, QueryVerifyMembershipRequest, QueryVerifyMembershipResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/client/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.clientState = this.clientState.bind(this);
        this.clientStates = this.clientStates.bind(this);
        this.consensusState = this.consensusState.bind(this);
        this.consensusStates = this.consensusStates.bind(this);
        this.consensusStateHeights = this.consensusStateHeights.bind(this);
        this.clientStatus = this.clientStatus.bind(this);
        this.clientParams = this.clientParams.bind(this);
        this.upgradedClientState = this.upgradedClientState.bind(this);
        this.upgradedConsensusState = this.upgradedConsensusState.bind(this);
        this.verifyMembership = this.verifyMembership.bind(this);
    }
    clientState(request) {
        const data = QueryClientStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ClientState', data);
        return promise.then(data => QueryClientStateResponse.decode(new BinaryReader(data)));
    }
    clientStates(request = {
        pagination: undefined,
    }) {
        const data = QueryClientStatesRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ClientStates', data);
        return promise.then(data => QueryClientStatesResponse.decode(new BinaryReader(data)));
    }
    consensusState(request) {
        const data = QueryConsensusStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ConsensusState', data);
        return promise.then(data => QueryConsensusStateResponse.decode(new BinaryReader(data)));
    }
    consensusStates(request) {
        const data = QueryConsensusStatesRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ConsensusStates', data);
        return promise.then(data => QueryConsensusStatesResponse.decode(new BinaryReader(data)));
    }
    consensusStateHeights(request) {
        const data = QueryConsensusStateHeightsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ConsensusStateHeights', data);
        return promise.then(data => QueryConsensusStateHeightsResponse.decode(new BinaryReader(data)));
    }
    clientStatus(request) {
        const data = QueryClientStatusRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ClientStatus', data);
        return promise.then(data => QueryClientStatusResponse.decode(new BinaryReader(data)));
    }
    clientParams(request = {}) {
        const data = QueryClientParamsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'ClientParams', data);
        return promise.then(data => QueryClientParamsResponse.decode(new BinaryReader(data)));
    }
    upgradedClientState(request = {}) {
        const data = QueryUpgradedClientStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'UpgradedClientState', data);
        return promise.then(data => QueryUpgradedClientStateResponse.decode(new BinaryReader(data)));
    }
    upgradedConsensusState(request = {}) {
        const data = QueryUpgradedConsensusStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'UpgradedConsensusState', data);
        return promise.then(data => QueryUpgradedConsensusStateResponse.decode(new BinaryReader(data)));
    }
    verifyMembership(request) {
        const data = QueryVerifyMembershipRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Query', 'VerifyMembership', data);
        return promise.then(data => QueryVerifyMembershipResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        clientState(request) {
            return queryService.clientState(request);
        },
        clientStates(request) {
            return queryService.clientStates(request);
        },
        consensusState(request) {
            return queryService.consensusState(request);
        },
        consensusStates(request) {
            return queryService.consensusStates(request);
        },
        consensusStateHeights(request) {
            return queryService.consensusStateHeights(request);
        },
        clientStatus(request) {
            return queryService.clientStatus(request);
        },
        clientParams(request) {
            return queryService.clientParams(request);
        },
        upgradedClientState(request) {
            return queryService.upgradedClientState(request);
        },
        upgradedConsensusState(request) {
            return queryService.upgradedConsensusState(request);
        },
        verifyMembership(request) {
            return queryService.verifyMembership(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map