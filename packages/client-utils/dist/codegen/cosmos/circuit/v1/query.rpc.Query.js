import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryAccountRequest, AccountResponse, QueryAccountsRequest, AccountsResponse, QueryDisabledListRequest, DisabledListResponse, } from '@agoric/cosmic-proto/codegen/cosmos/circuit/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.account = this.account.bind(this);
        this.accounts = this.accounts.bind(this);
        this.disabledList = this.disabledList.bind(this);
    }
    account(request) {
        const data = QueryAccountRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.circuit.v1.Query', 'Account', data);
        return promise.then(data => AccountResponse.decode(new BinaryReader(data)));
    }
    accounts(request = {
        pagination: undefined,
    }) {
        const data = QueryAccountsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.circuit.v1.Query', 'Accounts', data);
        return promise.then(data => AccountsResponse.decode(new BinaryReader(data)));
    }
    disabledList(request = {}) {
        const data = QueryDisabledListRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.circuit.v1.Query', 'DisabledList', data);
        return promise.then(data => DisabledListResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        account(request) {
            return queryService.account(request);
        },
        accounts(request) {
            return queryService.accounts(request);
        },
        disabledList(request) {
            return queryService.disabledList(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map