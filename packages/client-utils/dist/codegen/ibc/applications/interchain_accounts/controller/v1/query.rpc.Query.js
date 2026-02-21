import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryInterchainAccountRequest, QueryInterchainAccountResponse, QueryParamsRequest, QueryParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/controller/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.interchainAccount = this.interchainAccount.bind(this);
        this.params = this.params.bind(this);
    }
    interchainAccount(request) {
        const data = QueryInterchainAccountRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.controller.v1.Query', 'InterchainAccount', data);
        return promise.then(data => QueryInterchainAccountResponse.decode(new BinaryReader(data)));
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.controller.v1.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        interchainAccount(request) {
            return queryService.interchainAccount(request);
        },
        params(request) {
            return queryService.params(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map