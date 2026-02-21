//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse, QueryGetUserRedemptionRecordRequest, QueryGetUserRedemptionRecordResponse, QueryAllUserRedemptionRecordRequest, QueryAllUserRedemptionRecordResponse, QueryAllUserRedemptionRecordForUserRequest, QueryAllUserRedemptionRecordForUserResponse, QueryGetEpochUnbondingRecordRequest, QueryGetEpochUnbondingRecordResponse, QueryAllEpochUnbondingRecordRequest, QueryAllEpochUnbondingRecordResponse, QueryGetDepositRecordRequest, QueryGetDepositRecordResponse, QueryAllDepositRecordRequest, QueryAllDepositRecordResponse, QueryDepositRecordByHostRequest, QueryDepositRecordByHostResponse, QueryLSMDepositRequest, QueryLSMDepositResponse, QueryLSMDepositsRequest, QueryLSMDepositsResponse, } from '@agoric/cosmic-proto/codegen/stride/records/query.js';
/**
 * Parameters queries the parameters of the module.
 * @name getParams
 * @package stride.records
 * @see proto service: stride.records.Params
 */
export const getParams = buildQuery({
    encode: QueryParamsRequest.encode,
    decode: QueryParamsResponse.decode,
    service: 'stride.records.Query',
    method: 'Params',
    deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * Queries a UserRedemptionRecord by id.
 * @name getUserRedemptionRecord
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecord
 */
export const getUserRedemptionRecord = buildQuery({
    encode: QueryGetUserRedemptionRecordRequest.encode,
    decode: QueryGetUserRedemptionRecordResponse.decode,
    service: 'stride.records.Query',
    method: 'UserRedemptionRecord',
    deps: [
        QueryGetUserRedemptionRecordRequest,
        QueryGetUserRedemptionRecordResponse,
    ],
});
/**
 * Queries a list of UserRedemptionRecord items.
 * @name getUserRedemptionRecordAll
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecordAll
 */
export const getUserRedemptionRecordAll = buildQuery({
    encode: QueryAllUserRedemptionRecordRequest.encode,
    decode: QueryAllUserRedemptionRecordResponse.decode,
    service: 'stride.records.Query',
    method: 'UserRedemptionRecordAll',
    deps: [
        QueryAllUserRedemptionRecordRequest,
        QueryAllUserRedemptionRecordResponse,
    ],
});
/**
 * Queries a list of UserRedemptionRecord items by chainId / userId pair.
 * @name getUserRedemptionRecordForUser
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecordForUser
 */
export const getUserRedemptionRecordForUser = buildQuery({
    encode: QueryAllUserRedemptionRecordForUserRequest.encode,
    decode: QueryAllUserRedemptionRecordForUserResponse.decode,
    service: 'stride.records.Query',
    method: 'UserRedemptionRecordForUser',
    deps: [
        QueryAllUserRedemptionRecordForUserRequest,
        QueryAllUserRedemptionRecordForUserResponse,
    ],
});
/**
 * Queries a EpochUnbondingRecord by id.
 * @name getEpochUnbondingRecord
 * @package stride.records
 * @see proto service: stride.records.EpochUnbondingRecord
 */
export const getEpochUnbondingRecord = buildQuery({
    encode: QueryGetEpochUnbondingRecordRequest.encode,
    decode: QueryGetEpochUnbondingRecordResponse.decode,
    service: 'stride.records.Query',
    method: 'EpochUnbondingRecord',
    deps: [
        QueryGetEpochUnbondingRecordRequest,
        QueryGetEpochUnbondingRecordResponse,
    ],
});
/**
 * Queries a list of EpochUnbondingRecord items.
 * @name getEpochUnbondingRecordAll
 * @package stride.records
 * @see proto service: stride.records.EpochUnbondingRecordAll
 */
export const getEpochUnbondingRecordAll = buildQuery({
    encode: QueryAllEpochUnbondingRecordRequest.encode,
    decode: QueryAllEpochUnbondingRecordResponse.decode,
    service: 'stride.records.Query',
    method: 'EpochUnbondingRecordAll',
    deps: [
        QueryAllEpochUnbondingRecordRequest,
        QueryAllEpochUnbondingRecordResponse,
    ],
});
/**
 * Queries a DepositRecord by id.
 * @name getDepositRecord
 * @package stride.records
 * @see proto service: stride.records.DepositRecord
 */
export const getDepositRecord = buildQuery({
    encode: QueryGetDepositRecordRequest.encode,
    decode: QueryGetDepositRecordResponse.decode,
    service: 'stride.records.Query',
    method: 'DepositRecord',
    deps: [QueryGetDepositRecordRequest, QueryGetDepositRecordResponse],
});
/**
 * Queries a list of DepositRecord items.
 * @name getDepositRecordAll
 * @package stride.records
 * @see proto service: stride.records.DepositRecordAll
 */
export const getDepositRecordAll = buildQuery({
    encode: QueryAllDepositRecordRequest.encode,
    decode: QueryAllDepositRecordResponse.decode,
    service: 'stride.records.Query',
    method: 'DepositRecordAll',
    deps: [QueryAllDepositRecordRequest, QueryAllDepositRecordResponse],
});
/**
 * Queries a list of DepositRecord items for a given host zone
 * @name getDepositRecordByHost
 * @package stride.records
 * @see proto service: stride.records.DepositRecordByHost
 */
export const getDepositRecordByHost = buildQuery({
    encode: QueryDepositRecordByHostRequest.encode,
    decode: QueryDepositRecordByHostResponse.decode,
    service: 'stride.records.Query',
    method: 'DepositRecordByHost',
    deps: [QueryDepositRecordByHostRequest, QueryDepositRecordByHostResponse],
});
/**
 * Queries the existing LSMTokenDeposits for one specific deposit
 * @name getLSMDeposit
 * @package stride.records
 * @see proto service: stride.records.LSMDeposit
 */
export const getLSMDeposit = buildQuery({
    encode: QueryLSMDepositRequest.encode,
    decode: QueryLSMDepositResponse.decode,
    service: 'stride.records.Query',
    method: 'LSMDeposit',
    deps: [QueryLSMDepositRequest, QueryLSMDepositResponse],
});
/**
 * Queries the existing LSMTokenDeposits for all which match filters
 *   intended use:
 *   ...stakeibc/lsm_deposits?chain_id=X&validator_address=Y&status=Z
 * @name getLSMDeposits
 * @package stride.records
 * @see proto service: stride.records.LSMDeposits
 */
export const getLSMDeposits = buildQuery({
    encode: QueryLSMDepositsRequest.encode,
    decode: QueryLSMDepositsResponse.decode,
    service: 'stride.records.Query',
    method: 'LSMDeposits',
    deps: [QueryLSMDepositsRequest, QueryLSMDepositsResponse],
});
//# sourceMappingURL=query.rpc.func.js.map