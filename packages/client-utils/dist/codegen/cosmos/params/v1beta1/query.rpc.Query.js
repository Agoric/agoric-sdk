import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QuerySubspacesRequest, QuerySubspacesResponse, } from '@agoric/cosmic-proto/codegen/cosmos/params/v1beta1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.params = this.params.bind(this);
        this.subspaces = this.subspaces.bind(this);
    }
    params(request) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.params.v1beta1.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    subspaces(request = {}) {
        const data = QuerySubspacesRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.params.v1beta1.Query', 'Subspaces', data);
        return promise.then(data => QuerySubspacesResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        params(request) {
            return queryService.params(request);
        },
        subspaces(request) {
            return queryService.subspaces(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map