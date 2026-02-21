//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryAllowanceRequest, QueryAllowanceResponse, QueryAllowancesRequest, QueryAllowancesResponse, QueryAllowancesByGranterRequest, QueryAllowancesByGranterResponse, } from '@agoric/cosmic-proto/codegen/cosmos/feegrant/v1beta1/query.js';
/**
 * Allowance returns granted allwance to the grantee by the granter.
 * @name getAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.Allowance
 */
export const getAllowance = buildQuery({
    encode: QueryAllowanceRequest.encode,
    decode: QueryAllowanceResponse.decode,
    service: 'cosmos.feegrant.v1beta1.Query',
    method: 'Allowance',
    deps: [QueryAllowanceRequest, QueryAllowanceResponse],
});
/**
 * Allowances returns all the grants for the given grantee address.
 * @name getAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.Allowances
 */
export const getAllowances = buildQuery({
    encode: QueryAllowancesRequest.encode,
    decode: QueryAllowancesResponse.decode,
    service: 'cosmos.feegrant.v1beta1.Query',
    method: 'Allowances',
    deps: [QueryAllowancesRequest, QueryAllowancesResponse],
});
/**
 * AllowancesByGranter returns all the grants given by an address
 *
 * Since: cosmos-sdk 0.46
 * @name getAllowancesByGranter
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.AllowancesByGranter
 */
export const getAllowancesByGranter = buildQuery({
    encode: QueryAllowancesByGranterRequest.encode,
    decode: QueryAllowancesByGranterResponse.decode,
    service: 'cosmos.feegrant.v1beta1.Query',
    method: 'AllowancesByGranter',
    deps: [QueryAllowancesByGranterRequest, QueryAllowancesByGranterResponse],
});
//# sourceMappingURL=query.rpc.func.js.map