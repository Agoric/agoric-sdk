//@ts-nocheck
import { buildQuery } from '../../helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse } from './query.js';
/**
 * Params queries all parameters of the ICQ module.
 * @name getParams
 * @package icq.v1
 * @see proto service: icq.v1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'icq.v1.Query',
  method: 'Params',
});
