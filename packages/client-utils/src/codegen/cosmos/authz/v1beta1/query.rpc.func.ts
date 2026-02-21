//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryGrantsRequest,
  QueryGrantsResponse,
  QueryGranterGrantsRequest,
  QueryGranterGrantsResponse,
  QueryGranteeGrantsRequest,
  QueryGranteeGrantsResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/query.js';
/**
 * Returns list of `Authorization`, granted to the grantee by the granter.
 * @name getGrants
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Grants
 */
export const getGrants = buildQuery<QueryGrantsRequest, QueryGrantsResponse>({
  encode: QueryGrantsRequest.encode,
  decode: QueryGrantsResponse.decode,
  service: 'cosmos.authz.v1beta1.Query',
  method: 'Grants',
  deps: [QueryGrantsRequest, QueryGrantsResponse],
});
/**
 * GranterGrants returns list of `GrantAuthorization`, granted by granter.
 *
 * Since: cosmos-sdk 0.46
 * @name getGranterGrants
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.GranterGrants
 */
export const getGranterGrants = buildQuery<
  QueryGranterGrantsRequest,
  QueryGranterGrantsResponse
>({
  encode: QueryGranterGrantsRequest.encode,
  decode: QueryGranterGrantsResponse.decode,
  service: 'cosmos.authz.v1beta1.Query',
  method: 'GranterGrants',
  deps: [QueryGranterGrantsRequest, QueryGranterGrantsResponse],
});
/**
 * GranteeGrants returns a list of `GrantAuthorization` by grantee.
 *
 * Since: cosmos-sdk 0.46
 * @name getGranteeGrants
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.GranteeGrants
 */
export const getGranteeGrants = buildQuery<
  QueryGranteeGrantsRequest,
  QueryGranteeGrantsResponse
>({
  encode: QueryGranteeGrantsRequest.encode,
  decode: QueryGranteeGrantsResponse.decode,
  service: 'cosmos.authz.v1beta1.Query',
  method: 'GranteeGrants',
  deps: [QueryGranteeGrantsRequest, QueryGranteeGrantsResponse],
});
