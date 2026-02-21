import { QueryInterchainAccountRequest, QueryInterchainAccountResponse, QueryParamsRequest, QueryParamsResponse } from './query.js';
/**
 * InterchainAccount returns the interchain account address for a given owner address on a given connection
 * @name getInterchainAccount
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.InterchainAccount
 */
export declare const getInterchainAccount: (client: import("../../../../../helper-func-types.js").EndpointOrRpc, request: QueryInterchainAccountRequest) => Promise<QueryInterchainAccountResponse>;
/**
 * Params queries all parameters of the ICA controller submodule.
 * @name getParams
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.Params
 */
export declare const getParams: (client: import("../../../../../helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map