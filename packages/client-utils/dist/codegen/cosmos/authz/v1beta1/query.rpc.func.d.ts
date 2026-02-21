import { QueryGrantsRequest, QueryGrantsResponse, QueryGranterGrantsRequest, QueryGranterGrantsResponse, QueryGranteeGrantsRequest, QueryGranteeGrantsResponse } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/query.js';
/**
 * Returns list of `Authorization`, granted to the grantee by the granter.
 * @name getGrants
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Grants
 */
export declare const getGrants: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGrantsRequest) => Promise<QueryGrantsResponse>;
/**
 * GranterGrants returns list of `GrantAuthorization`, granted by granter.
 *
 * Since: cosmos-sdk 0.46
 * @name getGranterGrants
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.GranterGrants
 */
export declare const getGranterGrants: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGranterGrantsRequest) => Promise<QueryGranterGrantsResponse>;
/**
 * GranteeGrants returns a list of `GrantAuthorization` by grantee.
 *
 * Since: cosmos-sdk 0.46
 * @name getGranteeGrants
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.GranteeGrants
 */
export declare const getGranteeGrants: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGranteeGrantsRequest) => Promise<QueryGranteeGrantsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map