import { QueryParamsRequest, QueryParamsResponse, QueryGetUserRedemptionRecordRequest, QueryGetUserRedemptionRecordResponse, QueryAllUserRedemptionRecordRequest, QueryAllUserRedemptionRecordResponse, QueryAllUserRedemptionRecordForUserRequest, QueryAllUserRedemptionRecordForUserResponse, QueryGetEpochUnbondingRecordRequest, QueryGetEpochUnbondingRecordResponse, QueryAllEpochUnbondingRecordRequest, QueryAllEpochUnbondingRecordResponse, QueryGetDepositRecordRequest, QueryGetDepositRecordResponse, QueryAllDepositRecordRequest, QueryAllDepositRecordResponse, QueryDepositRecordByHostRequest, QueryDepositRecordByHostResponse, QueryLSMDepositRequest, QueryLSMDepositResponse, QueryLSMDepositsRequest, QueryLSMDepositsResponse } from '@agoric/cosmic-proto/codegen/stride/records/query.js';
/**
 * Parameters queries the parameters of the module.
 * @name getParams
 * @package stride.records
 * @see proto service: stride.records.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Queries a UserRedemptionRecord by id.
 * @name getUserRedemptionRecord
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecord
 */
export declare const getUserRedemptionRecord: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetUserRedemptionRecordRequest) => Promise<QueryGetUserRedemptionRecordResponse>;
/**
 * Queries a list of UserRedemptionRecord items.
 * @name getUserRedemptionRecordAll
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecordAll
 */
export declare const getUserRedemptionRecordAll: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllUserRedemptionRecordRequest) => Promise<QueryAllUserRedemptionRecordResponse>;
/**
 * Queries a list of UserRedemptionRecord items by chainId / userId pair.
 * @name getUserRedemptionRecordForUser
 * @package stride.records
 * @see proto service: stride.records.UserRedemptionRecordForUser
 */
export declare const getUserRedemptionRecordForUser: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllUserRedemptionRecordForUserRequest) => Promise<QueryAllUserRedemptionRecordForUserResponse>;
/**
 * Queries a EpochUnbondingRecord by id.
 * @name getEpochUnbondingRecord
 * @package stride.records
 * @see proto service: stride.records.EpochUnbondingRecord
 */
export declare const getEpochUnbondingRecord: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetEpochUnbondingRecordRequest) => Promise<QueryGetEpochUnbondingRecordResponse>;
/**
 * Queries a list of EpochUnbondingRecord items.
 * @name getEpochUnbondingRecordAll
 * @package stride.records
 * @see proto service: stride.records.EpochUnbondingRecordAll
 */
export declare const getEpochUnbondingRecordAll: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllEpochUnbondingRecordRequest) => Promise<QueryAllEpochUnbondingRecordResponse>;
/**
 * Queries a DepositRecord by id.
 * @name getDepositRecord
 * @package stride.records
 * @see proto service: stride.records.DepositRecord
 */
export declare const getDepositRecord: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetDepositRecordRequest) => Promise<QueryGetDepositRecordResponse>;
/**
 * Queries a list of DepositRecord items.
 * @name getDepositRecordAll
 * @package stride.records
 * @see proto service: stride.records.DepositRecordAll
 */
export declare const getDepositRecordAll: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllDepositRecordRequest) => Promise<QueryAllDepositRecordResponse>;
/**
 * Queries a list of DepositRecord items for a given host zone
 * @name getDepositRecordByHost
 * @package stride.records
 * @see proto service: stride.records.DepositRecordByHost
 */
export declare const getDepositRecordByHost: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDepositRecordByHostRequest) => Promise<QueryDepositRecordByHostResponse>;
/**
 * Queries the existing LSMTokenDeposits for one specific deposit
 * @name getLSMDeposit
 * @package stride.records
 * @see proto service: stride.records.LSMDeposit
 */
export declare const getLSMDeposit: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryLSMDepositRequest) => Promise<QueryLSMDepositResponse>;
/**
 * Queries the existing LSMTokenDeposits for all which match filters
 *   intended use:
 *   ...stakeibc/lsm_deposits?chain_id=X&validator_address=Y&status=Z
 * @name getLSMDeposits
 * @package stride.records
 * @see proto service: stride.records.LSMDeposits
 */
export declare const getLSMDeposits: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryLSMDepositsRequest) => Promise<QueryLSMDepositsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map