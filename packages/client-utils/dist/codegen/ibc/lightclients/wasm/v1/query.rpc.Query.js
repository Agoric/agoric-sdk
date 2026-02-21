import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryChecksumsRequest, QueryChecksumsResponse, QueryCodeRequest, QueryCodeResponse, } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.checksums = this.checksums.bind(this);
        this.code = this.code.bind(this);
    }
    checksums(request = {
        pagination: undefined,
    }) {
        const data = QueryChecksumsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.lightclients.wasm.v1.Query', 'Checksums', data);
        return promise.then(data => QueryChecksumsResponse.decode(new BinaryReader(data)));
    }
    code(request) {
        const data = QueryCodeRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.lightclients.wasm.v1.Query', 'Code', data);
        return promise.then(data => QueryCodeResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        checksums(request) {
            return queryService.checksums(request);
        },
        code(request) {
            return queryService.code(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map