import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryEgressRequest, QueryEgressResponse, QueryMailboxRequest, QueryMailboxResponse, } from '@agoric/cosmic-proto/codegen/agoric/swingset/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.params = this.params.bind(this);
        this.egress = this.egress.bind(this);
        this.mailbox = this.mailbox.bind(this);
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    egress(request) {
        const data = QueryEgressRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Query', 'Egress', data);
        return promise.then(data => QueryEgressResponse.decode(new BinaryReader(data)));
    }
    mailbox(request) {
        const data = QueryMailboxRequest.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Query', 'Mailbox', data);
        return promise.then(data => QueryMailboxResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        params(request) {
            return queryService.params(request);
        },
        egress(request) {
            return queryService.egress(request);
        },
        mailbox(request) {
            return queryService.mailbox(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map