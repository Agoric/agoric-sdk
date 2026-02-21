//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryChecksumsRequest,
  QueryChecksumsResponse,
  QueryCodeRequest,
  QueryCodeResponse,
} from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/query.js';
/**
 * Get all Wasm checksums
 * @name getChecksums
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.Checksums
 */
export const getChecksums = buildQuery<
  QueryChecksumsRequest,
  QueryChecksumsResponse
>({
  encode: QueryChecksumsRequest.encode,
  decode: QueryChecksumsResponse.decode,
  service: 'ibc.lightclients.wasm.v1.Query',
  method: 'Checksums',
  deps: [QueryChecksumsRequest, QueryChecksumsResponse],
});
/**
 * Get Wasm code for given checksum
 * @name getCode
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.Code
 */
export const getCode = buildQuery<QueryCodeRequest, QueryCodeResponse>({
  encode: QueryCodeRequest.encode,
  decode: QueryCodeResponse.decode,
  service: 'ibc.lightclients.wasm.v1.Query',
  method: 'Code',
  deps: [QueryCodeRequest, QueryCodeResponse],
});
