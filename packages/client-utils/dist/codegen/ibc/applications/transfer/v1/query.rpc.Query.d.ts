import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryDenomTracesRequest, QueryDenomTracesResponse, QueryDenomTraceRequest, QueryDenomTraceResponse, QueryParamsRequest, QueryParamsResponse, QueryDenomHashRequest, QueryDenomHashResponse, QueryEscrowAddressRequest, QueryEscrowAddressResponse, QueryTotalEscrowForDenomRequest, QueryTotalEscrowForDenomResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/query.js';
/** Query provides defines the gRPC querier service. */
export interface Query {
    /** DenomTraces queries all denomination traces. */
    denomTraces(request?: QueryDenomTracesRequest): Promise<QueryDenomTracesResponse>;
    /** DenomTrace queries a denomination trace information. */
    denomTrace(request: QueryDenomTraceRequest): Promise<QueryDenomTraceResponse>;
    /** Params queries all parameters of the ibc-transfer module. */
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    /** DenomHash queries a denomination hash information. */
    denomHash(request: QueryDenomHashRequest): Promise<QueryDenomHashResponse>;
    /** EscrowAddress returns the escrow address for a particular port and channel id. */
    escrowAddress(request: QueryEscrowAddressRequest): Promise<QueryEscrowAddressResponse>;
    /** TotalEscrowForDenom returns the total amount of tokens in escrow based on the denom. */
    totalEscrowForDenom(request: QueryTotalEscrowForDenomRequest): Promise<QueryTotalEscrowForDenomResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    denomTraces(request?: QueryDenomTracesRequest): Promise<QueryDenomTracesResponse>;
    denomTrace(request: QueryDenomTraceRequest): Promise<QueryDenomTraceResponse>;
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    denomHash(request: QueryDenomHashRequest): Promise<QueryDenomHashResponse>;
    escrowAddress(request: QueryEscrowAddressRequest): Promise<QueryEscrowAddressResponse>;
    totalEscrowForDenom(request: QueryTotalEscrowForDenomRequest): Promise<QueryTotalEscrowForDenomResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    denomTraces(request?: QueryDenomTracesRequest): Promise<QueryDenomTracesResponse>;
    denomTrace(request: QueryDenomTraceRequest): Promise<QueryDenomTraceResponse>;
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    denomHash(request: QueryDenomHashRequest): Promise<QueryDenomHashResponse>;
    escrowAddress(request: QueryEscrowAddressRequest): Promise<QueryEscrowAddressResponse>;
    totalEscrowForDenom(request: QueryTotalEscrowForDenomRequest): Promise<QueryTotalEscrowForDenomResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map