import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryGetValidatorsRequest, QueryGetValidatorsResponse, QueryGetHostZoneRequest, QueryGetHostZoneResponse, QueryAllHostZoneRequest, QueryAllHostZoneResponse, QueryModuleAddressRequest, QueryModuleAddressResponse, QueryInterchainAccountFromAddressRequest, QueryInterchainAccountFromAddressResponse, QueryGetEpochTrackerRequest, QueryGetEpochTrackerResponse, QueryAllEpochTrackerRequest, QueryAllEpochTrackerResponse, QueryGetNextPacketSequenceRequest, QueryGetNextPacketSequenceResponse, QueryAddressUnbondings, QueryAddressUnbondingsResponse, QueryAllTradeRoutes, QueryAllTradeRoutesResponse, } from '@agoric/cosmic-proto/codegen/stride/stakeibc/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.params = this.params.bind(this);
        this.validators = this.validators.bind(this);
        this.hostZone = this.hostZone.bind(this);
        this.hostZoneAll = this.hostZoneAll.bind(this);
        this.moduleAddress = this.moduleAddress.bind(this);
        this.interchainAccountFromAddress =
            this.interchainAccountFromAddress.bind(this);
        this.epochTracker = this.epochTracker.bind(this);
        this.epochTrackerAll = this.epochTrackerAll.bind(this);
        this.nextPacketSequence = this.nextPacketSequence.bind(this);
        this.addressUnbondings = this.addressUnbondings.bind(this);
        this.allTradeRoutes = this.allTradeRoutes.bind(this);
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    validators(request) {
        const data = QueryGetValidatorsRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'Validators', data);
        return promise.then(data => QueryGetValidatorsResponse.decode(new BinaryReader(data)));
    }
    hostZone(request) {
        const data = QueryGetHostZoneRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'HostZone', data);
        return promise.then(data => QueryGetHostZoneResponse.decode(new BinaryReader(data)));
    }
    hostZoneAll(request = {
        pagination: undefined,
    }) {
        const data = QueryAllHostZoneRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'HostZoneAll', data);
        return promise.then(data => QueryAllHostZoneResponse.decode(new BinaryReader(data)));
    }
    moduleAddress(request) {
        const data = QueryModuleAddressRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'ModuleAddress', data);
        return promise.then(data => QueryModuleAddressResponse.decode(new BinaryReader(data)));
    }
    interchainAccountFromAddress(request) {
        const data = QueryInterchainAccountFromAddressRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'InterchainAccountFromAddress', data);
        return promise.then(data => QueryInterchainAccountFromAddressResponse.decode(new BinaryReader(data)));
    }
    epochTracker(request) {
        const data = QueryGetEpochTrackerRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'EpochTracker', data);
        return promise.then(data => QueryGetEpochTrackerResponse.decode(new BinaryReader(data)));
    }
    epochTrackerAll(request = {}) {
        const data = QueryAllEpochTrackerRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'EpochTrackerAll', data);
        return promise.then(data => QueryAllEpochTrackerResponse.decode(new BinaryReader(data)));
    }
    nextPacketSequence(request) {
        const data = QueryGetNextPacketSequenceRequest.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'NextPacketSequence', data);
        return promise.then(data => QueryGetNextPacketSequenceResponse.decode(new BinaryReader(data)));
    }
    addressUnbondings(request) {
        const data = QueryAddressUnbondings.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'AddressUnbondings', data);
        return promise.then(data => QueryAddressUnbondingsResponse.decode(new BinaryReader(data)));
    }
    allTradeRoutes(request = {}) {
        const data = QueryAllTradeRoutes.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Query', 'AllTradeRoutes', data);
        return promise.then(data => QueryAllTradeRoutesResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        params(request) {
            return queryService.params(request);
        },
        validators(request) {
            return queryService.validators(request);
        },
        hostZone(request) {
            return queryService.hostZone(request);
        },
        hostZoneAll(request) {
            return queryService.hostZoneAll(request);
        },
        moduleAddress(request) {
            return queryService.moduleAddress(request);
        },
        interchainAccountFromAddress(request) {
            return queryService.interchainAccountFromAddress(request);
        },
        epochTracker(request) {
            return queryService.epochTracker(request);
        },
        epochTrackerAll(request) {
            return queryService.epochTrackerAll(request);
        },
        nextPacketSequence(request) {
            return queryService.nextPacketSequence(request);
        },
        addressUnbondings(request) {
            return queryService.addressUnbondings(request);
        },
        allTradeRoutes(request) {
            return queryService.allTradeRoutes(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map