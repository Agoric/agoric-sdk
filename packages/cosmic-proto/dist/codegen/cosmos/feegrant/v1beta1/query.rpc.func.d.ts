import { QueryAllowanceRequest, QueryAllowanceResponse, QueryAllowancesRequest, QueryAllowancesResponse, QueryAllowancesByGranterRequest, QueryAllowancesByGranterResponse } from './query.js';
/**
 * Allowance returns granted allwance to the grantee by the granter.
 * @name getAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.Allowance
 */
export declare const getAllowance: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAllowanceRequest) => Promise<QueryAllowanceResponse>;
/**
 * Allowances returns all the grants for the given grantee address.
 * @name getAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.Allowances
 */
export declare const getAllowances: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAllowancesRequest) => Promise<QueryAllowancesResponse>;
/**
 * AllowancesByGranter returns all the grants given by an address
 *
 * Since: cosmos-sdk 0.46
 * @name getAllowancesByGranter
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.AllowancesByGranter
 */
export declare const getAllowancesByGranter: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAllowancesByGranterRequest) => Promise<QueryAllowancesByGranterResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map