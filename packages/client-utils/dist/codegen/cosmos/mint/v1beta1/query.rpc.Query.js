import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryInflationRequest, QueryInflationResponse, QueryAnnualProvisionsRequest, QueryAnnualProvisionsResponse, } from '@agoric/cosmic-proto/codegen/cosmos/mint/v1beta1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.params = this.params.bind(this);
        this.inflation = this.inflation.bind(this);
        this.annualProvisions = this.annualProvisions.bind(this);
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.mint.v1beta1.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    inflation(request = {}) {
        const data = QueryInflationRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.mint.v1beta1.Query', 'Inflation', data);
        return promise.then(data => QueryInflationResponse.decode(new BinaryReader(data)));
    }
    annualProvisions(request = {}) {
        const data = QueryAnnualProvisionsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.mint.v1beta1.Query', 'AnnualProvisions', data);
        return promise.then(data => QueryAnnualProvisionsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        params(request) {
            return queryService.params(request);
        },
        inflation(request) {
            return queryService.inflation(request);
        },
        annualProvisions(request) {
            return queryService.annualProvisions(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map