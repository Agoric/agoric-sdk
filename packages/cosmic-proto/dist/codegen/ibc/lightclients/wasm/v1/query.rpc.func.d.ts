import { QueryChecksumsRequest, QueryChecksumsResponse, QueryCodeRequest, QueryCodeResponse } from './query.js';
/**
 * Get all Wasm checksums
 * @name getChecksums
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.Checksums
 */
export declare const getChecksums: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryChecksumsRequest) => Promise<QueryChecksumsResponse>;
/**
 * Get Wasm code for given checksum
 * @name getCode
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.Code
 */
export declare const getCode: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryCodeRequest) => Promise<QueryCodeResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map