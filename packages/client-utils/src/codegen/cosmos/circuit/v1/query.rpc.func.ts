//@ts-nocheck
import { buildQuery } from '../../../helper-func-types.js';
import {
  QueryAccountRequest,
  AccountResponse,
  QueryAccountsRequest,
  AccountsResponse,
  QueryDisabledListRequest,
  DisabledListResponse,
} from './query.js';
/**
 * Account returns account permissions.
 * @name getAccount
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.Account
 */
export const getAccount = buildQuery<QueryAccountRequest, AccountResponse>({
  encode: QueryAccountRequest.encode,
  decode: AccountResponse.decode,
  service: 'cosmos.circuit.v1.Query',
  method: 'Account',
});
/**
 * Account returns account permissions.
 * @name getAccounts
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.Accounts
 */
export const getAccounts = buildQuery<QueryAccountsRequest, AccountsResponse>({
  encode: QueryAccountsRequest.encode,
  decode: AccountsResponse.decode,
  service: 'cosmos.circuit.v1.Query',
  method: 'Accounts',
});
/**
 * DisabledList returns a list of disabled message urls
 * @name getDisabledList
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.DisabledList
 */
export const getDisabledList = buildQuery<
  QueryDisabledListRequest,
  DisabledListResponse
>({
  encode: QueryDisabledListRequest.encode,
  decode: DisabledListResponse.decode,
  service: 'cosmos.circuit.v1.Query',
  method: 'DisabledList',
});
