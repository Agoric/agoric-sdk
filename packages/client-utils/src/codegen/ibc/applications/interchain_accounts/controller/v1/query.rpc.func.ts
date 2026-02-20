//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryInterchainAccountRequest,
  QueryInterchainAccountResponse,
  QueryParamsRequest,
  QueryParamsResponse,
} from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/controller/v1/query.js';
/**
 * InterchainAccount returns the interchain account address for a given owner address on a given connection
 * @name getInterchainAccount
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.InterchainAccount
 */
export const getInterchainAccount = buildQuery<
  QueryInterchainAccountRequest,
  QueryInterchainAccountResponse
>({
  encode: QueryInterchainAccountRequest.encode,
  decode: QueryInterchainAccountResponse.decode,
  service: 'ibc.applications.interchain_accounts.controller.v1.Query',
  method: 'InterchainAccount',
  deps: [QueryInterchainAccountRequest, QueryInterchainAccountResponse],
});
/**
 * Params queries all parameters of the ICA controller submodule.
 * @name getParams
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'ibc.applications.interchain_accounts.controller.v1.Query',
  method: 'Params',
  deps: [QueryParamsRequest, QueryParamsResponse],
});
