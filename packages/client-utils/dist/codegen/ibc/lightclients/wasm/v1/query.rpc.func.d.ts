import { QueryChecksumsRequest, QueryChecksumsResponse, QueryCodeRequest, QueryCodeResponse } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/query.js';
/**
 * Get all Wasm checksums
 * @name getChecksums
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.Checksums
 */
export declare const getChecksums: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryChecksumsRequest) => Promise<QueryChecksumsResponse>;
/**
 * Get Wasm code for given checksum
 * @name getCode
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.Code
 */
export declare const getCode: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryCodeRequest) => Promise<QueryCodeResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map