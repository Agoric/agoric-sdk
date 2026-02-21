//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/host/v1/query.js';
/**
 * Params queries all parameters of the ICA host submodule.
 * @name getParams
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto service: ibc.applications.interchain_accounts.host.v1.Params
 */
export const getParams = buildQuery({
    encode: QueryParamsRequest.encode,
    decode: QueryParamsResponse.decode,
    service: 'ibc.applications.interchain_accounts.host.v1.Query',
    method: 'Params',
    deps: [QueryParamsRequest, QueryParamsResponse],
});
//# sourceMappingURL=query.rpc.func.js.map