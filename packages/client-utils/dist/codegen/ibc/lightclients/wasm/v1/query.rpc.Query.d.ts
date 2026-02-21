import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryChecksumsRequest, QueryChecksumsResponse, QueryCodeRequest, QueryCodeResponse } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/query.js';
/** Query service for wasm module */
export interface Query {
    /** Get all Wasm checksums */
    checksums(request?: QueryChecksumsRequest): Promise<QueryChecksumsResponse>;
    /** Get Wasm code for given checksum */
    code(request: QueryCodeRequest): Promise<QueryCodeResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    checksums(request?: QueryChecksumsRequest): Promise<QueryChecksumsResponse>;
    code(request: QueryCodeRequest): Promise<QueryCodeResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    checksums(request?: QueryChecksumsRequest): Promise<QueryChecksumsResponse>;
    code(request: QueryCodeRequest): Promise<QueryCodeResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map