import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryDataRequest, QueryDataResponse, QueryCapDataRequest, QueryCapDataResponse, QueryChildrenRequest, QueryChildrenResponse, } from '@agoric/cosmic-proto/codegen/agoric/vstorage/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.data = this.data.bind(this);
        this.capData = this.capData.bind(this);
        this.children = this.children.bind(this);
    }
    data(request) {
        const data = QueryDataRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.vstorage.Query', 'Data', data);
        return promise.then(data => QueryDataResponse.decode(new BinaryReader(data)));
    }
    capData(request) {
        const data = QueryCapDataRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.vstorage.Query', 'CapData', data);
        return promise.then(data => QueryCapDataResponse.decode(new BinaryReader(data)));
    }
    children(request) {
        const data = QueryChildrenRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.vstorage.Query', 'Children', data);
        return promise.then(data => QueryChildrenResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        data(request) {
            return queryService.data(request);
        },
        capData(request) {
            return queryService.capData(request);
        },
        children(request) {
            return queryService.children(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map