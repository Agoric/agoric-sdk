//@ts-nocheck
import { buildQuery } from '../../helper-func-types.js';
import {
  QueryParamsRequest,
  QueryParamsResponse,
  QueryGetUserRedemptionRecordRequest,
  QueryGetUserRedemptionRecordResponse,
  QueryAllUserRedemptionRecordRequest,
  QueryAllUserRedemptionRecordResponse,
  QueryAllUserRedemptionRecordForUserRequest,
  QueryAllUserRedemptionRecordForUserResponse,
  QueryGetEpochUnbondingRecordRequest,
  QueryGetEpochUnbondingRecordResponse,
  QueryAllEpochUnbondingRecordRequest,
  QueryAllEpochUnbondingRecordResponse,
  QueryGetDepositRecordRequest,
  QueryGetDepositRecordResponse,
  QueryAllDepositRecordRequest,
  QueryAllDepositRecordResponse,
  QueryDepositRecordByHostRequest,
  QueryDepositRecordByHostResponse,
  QueryLSMDepositRequest,
  QueryLSMDepositResponse,
  QueryLSMDepositsRequest,
  QueryLSMDepositsResponse,
} from './query.js';
/**
 * Parameters queries the parameters of the module.
 * @name getParams
 * @package stride.records
 * @see proto service: stride.records.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'stride.records.Query',
  method: 'Params',
});
/**
 * Queries a UserRedemptionRecord by id.
 * @name getUserRedemptionRecord
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecord
 */
export const getUserRedemptionRecord = buildQuery<
  QueryGetUserRedemptionRecordRequest,
  QueryGetUserRedemptionRecordResponse
>({
  encode: QueryGetUserRedemptionRecordRequest.encode,
  decode: QueryGetUserRedemptionRecordResponse.decode,
  service: 'stride.records.Query',
  method: 'UserRedemptionRecord',
});
/**
 * Queries a list of UserRedemptionRecord items.
 * @name getUserRedemptionRecordAll
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecordAll
 */
export const getUserRedemptionRecordAll = buildQuery<
  QueryAllUserRedemptionRecordRequest,
  QueryAllUserRedemptionRecordResponse
>({
  encode: QueryAllUserRedemptionRecordRequest.encode,
  decode: QueryAllUserRedemptionRecordResponse.decode,
  service: 'stride.records.Query',
  method: 'UserRedemptionRecordAll',
});
/**
 * Queries a list of UserRedemptionRecord items by chainId / userId pair.
 * @name getUserRedemptionRecordForUser
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecordForUser
 */
export const getUserRedemptionRecordForUser = buildQuery<
  QueryAllUserRedemptionRecordForUserRequest,
  QueryAllUserRedemptionRecordForUserResponse
>({
  encode: QueryAllUserRedemptionRecordForUserRequest.encode,
  decode: QueryAllUserRedemptionRecordForUserResponse.decode,
  service: 'stride.records.Query',
  method: 'UserRedemptionRecordForUser',
});
/**
 * Queries a EpochUnbondingRecord by id.
 * @name getEpochUnbondingRecord
 * @package stride.records
 * @see proto service: stride.records.EpochUnbondingRecord
 */
export const getEpochUnbondingRecord = buildQuery<
  QueryGetEpochUnbondingRecordRequest,
  QueryGetEpochUnbondingRecordResponse
>({
  encode: QueryGetEpochUnbondingRecordRequest.encode,
  decode: QueryGetEpochUnbondingRecordResponse.decode,
  service: 'stride.records.Query',
  method: 'EpochUnbondingRecord',
});
/**
 * Queries a list of EpochUnbondingRecord items.
 * @name getEpochUnbondingRecordAll
 * @package stride.records
 * @see proto service: stride.records.EpochUnbondingRecordAll
 */
export const getEpochUnbondingRecordAll = buildQuery<
  QueryAllEpochUnbondingRecordRequest,
  QueryAllEpochUnbondingRecordResponse
>({
  encode: QueryAllEpochUnbondingRecordRequest.encode,
  decode: QueryAllEpochUnbondingRecordResponse.decode,
  service: 'stride.records.Query',
  method: 'EpochUnbondingRecordAll',
});
/**
 * Queries a DepositRecord by id.
 * @name getDepositRecord
 * @package stride.records
 * @see proto service: stride.records.DepositRecord
 */
export const getDepositRecord = buildQuery<
  QueryGetDepositRecordRequest,
  QueryGetDepositRecordResponse
>({
  encode: QueryGetDepositRecordRequest.encode,
  decode: QueryGetDepositRecordResponse.decode,
  service: 'stride.records.Query',
  method: 'DepositRecord',
});
/**
 * Queries a list of DepositRecord items.
 * @name getDepositRecordAll
 * @package stride.records
 * @see proto service: stride.records.DepositRecordAll
 */
export const getDepositRecordAll = buildQuery<
  QueryAllDepositRecordRequest,
  QueryAllDepositRecordResponse
>({
  encode: QueryAllDepositRecordRequest.encode,
  decode: QueryAllDepositRecordResponse.decode,
  service: 'stride.records.Query',
  method: 'DepositRecordAll',
});
/**
 * Queries a list of DepositRecord items for a given host zone
 * @name getDepositRecordByHost
 * @package stride.records
 * @see proto service: stride.records.DepositRecordByHost
 */
export const getDepositRecordByHost = buildQuery<
  QueryDepositRecordByHostRequest,
  QueryDepositRecordByHostResponse
>({
  encode: QueryDepositRecordByHostRequest.encode,
  decode: QueryDepositRecordByHostResponse.decode,
  service: 'stride.records.Query',
  method: 'DepositRecordByHost',
});
/**
 * Queries the existing LSMTokenDeposits for one specific deposit
 * @name getLSMDeposit
 * @package stride.records
 * @see proto service: stride.records.LSMDeposit
 */
export const getLSMDeposit = buildQuery<
  QueryLSMDepositRequest,
  QueryLSMDepositResponse
>({
  encode: QueryLSMDepositRequest.encode,
  decode: QueryLSMDepositResponse.decode,
  service: 'stride.records.Query',
  method: 'LSMDeposit',
});
/**
 * Queries the existing LSMTokenDeposits for all which match filters
 *   intended use:
 *   ...stakeibc/lsm_deposits?chain_id=X&validator_address=Y&status=Z
 * @name getLSMDeposits
 * @package stride.records
 * @see proto service: stride.records.LSMDeposits
 */
export const getLSMDeposits = buildQuery<
  QueryLSMDepositsRequest,
  QueryLSMDepositsResponse
>({
  encode: QueryLSMDepositsRequest.encode,
  decode: QueryLSMDepositsResponse.decode,
  service: 'stride.records.Query',
  method: 'LSMDeposits',
});
