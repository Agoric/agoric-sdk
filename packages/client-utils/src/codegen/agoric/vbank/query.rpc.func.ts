//@ts-nocheck
import { buildQuery } from '../../helper-func-types.js';
import {
  QueryParamsRequest,
  QueryParamsResponse,
  QueryStateRequest,
  QueryStateResponse,
} from './query.js';
/**
 * Params queries params of the vbank module.
 * @name getParams
 * @package agoric.vbank
 * @see proto service: agoric.vbank.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'agoric.vbank.Query',
  method: 'Params',
  deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * State queries current state of the vbank module.
 * @name getState
 * @package agoric.vbank
 * @see proto service: agoric.vbank.State
 */
export const getState = buildQuery<QueryStateRequest, QueryStateResponse>({
  encode: QueryStateRequest.encode,
  decode: QueryStateResponse.decode,
  service: 'agoric.vbank.Query',
  method: 'State',
  deps: [QueryStateRequest, QueryStateResponse],
});
