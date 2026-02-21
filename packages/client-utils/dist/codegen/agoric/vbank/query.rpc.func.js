//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse, QueryStateRequest, QueryStateResponse, } from '@agoric/cosmic-proto/codegen/agoric/vbank/query.js';
/**
 * Params queries params of the vbank module.
 * @name getParams
 * @package agoric.vbank
 * @see proto service: agoric.vbank.Params
 */
export const getParams = buildQuery({
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
export const getState = buildQuery({
    encode: QueryStateRequest.encode,
    decode: QueryStateResponse.decode,
    service: 'agoric.vbank.Query',
    method: 'State',
    deps: [QueryStateRequest, QueryStateResponse],
});
//# sourceMappingURL=query.rpc.func.js.map