//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryParamsRequest,
  QueryParamsResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/consensus/v1/query.js';
/**
 * Params queries the parameters of x/consensus module.
 * @name getParams
 * @package cosmos.consensus.v1
 * @see proto service: cosmos.consensus.v1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'cosmos.consensus.v1.Query',
  method: 'Params',
  deps: [QueryParamsRequest, QueryParamsResponse],
});
