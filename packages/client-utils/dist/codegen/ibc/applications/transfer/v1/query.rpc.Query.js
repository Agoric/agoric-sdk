import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryDenomTracesRequest, QueryDenomTracesResponse, QueryDenomTraceRequest, QueryDenomTraceResponse, QueryParamsRequest, QueryParamsResponse, QueryDenomHashRequest, QueryDenomHashResponse, QueryEscrowAddressRequest, QueryEscrowAddressResponse, QueryTotalEscrowForDenomRequest, QueryTotalEscrowForDenomResponse, } from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.denomTraces = this.denomTraces.bind(this);
        this.denomTrace = this.denomTrace.bind(this);
        this.params = this.params.bind(this);
        this.denomHash = this.denomHash.bind(this);
        this.escrowAddress = this.escrowAddress.bind(this);
        this.totalEscrowForDenom = this.totalEscrowForDenom.bind(this);
    }
    denomTraces(request = {
        pagination: undefined,
    }) {
        const data = QueryDenomTracesRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Query', 'DenomTraces', data);
        return promise.then(data => QueryDenomTracesResponse.decode(new BinaryReader(data)));
    }
    denomTrace(request) {
        const data = QueryDenomTraceRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Query', 'DenomTrace', data);
        return promise.then(data => QueryDenomTraceResponse.decode(new BinaryReader(data)));
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    denomHash(request) {
        const data = QueryDenomHashRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Query', 'DenomHash', data);
        return promise.then(data => QueryDenomHashResponse.decode(new BinaryReader(data)));
    }
    escrowAddress(request) {
        const data = QueryEscrowAddressRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Query', 'EscrowAddress', data);
        return promise.then(data => QueryEscrowAddressResponse.decode(new BinaryReader(data)));
    }
    totalEscrowForDenom(request) {
        const data = QueryTotalEscrowForDenomRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Query', 'TotalEscrowForDenom', data);
        return promise.then(data => QueryTotalEscrowForDenomResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        denomTraces(request) {
            return queryService.denomTraces(request);
        },
        denomTrace(request) {
            return queryService.denomTrace(request);
        },
        params(request) {
            return queryService.params(request);
        },
        denomHash(request) {
            return queryService.denomHash(request);
        },
        escrowAddress(request) {
            return queryService.escrowAddress(request);
        },
        totalEscrowForDenom(request) {
            return queryService.totalEscrowForDenom(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map