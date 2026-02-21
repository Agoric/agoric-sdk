import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryEpochsInfoRequest, QueryEpochsInfoResponse, QueryCurrentEpochRequest, QueryCurrentEpochResponse, QueryEpochInfoRequest, QueryEpochInfoResponse, } from '@agoric/cosmic-proto/codegen/stride/epochs/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.epochInfos = this.epochInfos.bind(this);
        this.currentEpoch = this.currentEpoch.bind(this);
        this.epochInfo = this.epochInfo.bind(this);
    }
    epochInfos(request = {
        pagination: undefined,
    }) {
        const data = QueryEpochsInfoRequest.encode(request).finish();
        const promise = this.rpc.request('stride.epochs.Query', 'EpochInfos', data);
        return promise.then(data => QueryEpochsInfoResponse.decode(new BinaryReader(data)));
    }
    currentEpoch(request) {
        const data = QueryCurrentEpochRequest.encode(request).finish();
        const promise = this.rpc.request('stride.epochs.Query', 'CurrentEpoch', data);
        return promise.then(data => QueryCurrentEpochResponse.decode(new BinaryReader(data)));
    }
    epochInfo(request) {
        const data = QueryEpochInfoRequest.encode(request).finish();
        const promise = this.rpc.request('stride.epochs.Query', 'EpochInfo', data);
        return promise.then(data => QueryEpochInfoResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        epochInfos(request) {
            return queryService.epochInfos(request);
        },
        currentEpoch(request) {
            return queryService.currentEpoch(request);
        },
        epochInfo(request) {
            return queryService.epochInfo(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map