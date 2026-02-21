import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryStateRequest, QueryStateResponse, } from '@agoric/cosmic-proto/codegen/agoric/vbank/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.params = this.params.bind(this);
        this.state = this.state.bind(this);
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.vbank.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    state(request = {}) {
        const data = QueryStateRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.vbank.Query', 'State', data);
        return promise.then(data => QueryStateResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        params(request) {
            return queryService.params(request);
        },
        state(request) {
            return queryService.state(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map