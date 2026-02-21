import { QueryAccountRequest, AccountResponse, QueryAccountsRequest, AccountsResponse, QueryDisabledListRequest, DisabledListResponse } from '@agoric/cosmic-proto/codegen/cosmos/circuit/v1/query.js';
/**
 * Account returns account permissions.
 * @name getAccount
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.Account
 */
export declare const getAccount: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAccountRequest) => Promise<AccountResponse>;
/**
 * Account returns account permissions.
 * @name getAccounts
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.Accounts
 */
export declare const getAccounts: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAccountsRequest) => Promise<AccountsResponse>;
/**
 * DisabledList returns a list of disabled message urls
 * @name getDisabledList
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.DisabledList
 */
export declare const getDisabledList: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDisabledListRequest) => Promise<DisabledListResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map