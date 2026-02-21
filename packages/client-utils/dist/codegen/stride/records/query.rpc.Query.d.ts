import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryGetUserRedemptionRecordRequest, QueryGetUserRedemptionRecordResponse, QueryAllUserRedemptionRecordRequest, QueryAllUserRedemptionRecordResponse, QueryAllUserRedemptionRecordForUserRequest, QueryAllUserRedemptionRecordForUserResponse, QueryGetEpochUnbondingRecordRequest, QueryGetEpochUnbondingRecordResponse, QueryAllEpochUnbondingRecordRequest, QueryAllEpochUnbondingRecordResponse, QueryGetDepositRecordRequest, QueryGetDepositRecordResponse, QueryAllDepositRecordRequest, QueryAllDepositRecordResponse, QueryDepositRecordByHostRequest, QueryDepositRecordByHostResponse, QueryLSMDepositRequest, QueryLSMDepositResponse, QueryLSMDepositsRequest, QueryLSMDepositsResponse } from '@agoric/cosmic-proto/codegen/stride/records/query.js';
/** Query defines the gRPC querier service. */
export interface Query {
    /** Parameters queries the parameters of the module. */
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    /** Queries a UserRedemptionRecord by id. */
    userRedemptionRecord(request: QueryGetUserRedemptionRecordRequest): Promise<QueryGetUserRedemptionRecordResponse>;
    /** Queries a list of UserRedemptionRecord items. */
    userRedemptionRecordAll(request?: QueryAllUserRedemptionRecordRequest): Promise<QueryAllUserRedemptionRecordResponse>;
    /** Queries a list of UserRedemptionRecord items by chainId / userId pair. */
    userRedemptionRecordForUser(request: QueryAllUserRedemptionRecordForUserRequest): Promise<QueryAllUserRedemptionRecordForUserResponse>;
    /** Queries a EpochUnbondingRecord by id. */
    epochUnbondingRecord(request: QueryGetEpochUnbondingRecordRequest): Promise<QueryGetEpochUnbondingRecordResponse>;
    /** Queries a list of EpochUnbondingRecord items. */
    epochUnbondingRecordAll(request?: QueryAllEpochUnbondingRecordRequest): Promise<QueryAllEpochUnbondingRecordResponse>;
    /** Queries a DepositRecord by id. */
    depositRecord(request: QueryGetDepositRecordRequest): Promise<QueryGetDepositRecordResponse>;
    /** Queries a list of DepositRecord items. */
    depositRecordAll(request?: QueryAllDepositRecordRequest): Promise<QueryAllDepositRecordResponse>;
    /** Queries a list of DepositRecord items for a given host zone */
    depositRecordByHost(request: QueryDepositRecordByHostRequest): Promise<QueryDepositRecordByHostResponse>;
    /** Queries the existing LSMTokenDeposits for one specific deposit */
    lSMDeposit(request: QueryLSMDepositRequest): Promise<QueryLSMDepositResponse>;
    /**
     * Queries the existing LSMTokenDeposits for all which match filters
     *   intended use:
     *   ...stakeibc/lsm_deposits?chain_id=X&validator_address=Y&status=Z
     */
    lSMDeposits(request: QueryLSMDepositsRequest): Promise<QueryLSMDepositsResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    userRedemptionRecord(request: QueryGetUserRedemptionRecordRequest): Promise<QueryGetUserRedemptionRecordResponse>;
    userRedemptionRecordAll(request?: QueryAllUserRedemptionRecordRequest): Promise<QueryAllUserRedemptionRecordResponse>;
    userRedemptionRecordForUser(request: QueryAllUserRedemptionRecordForUserRequest): Promise<QueryAllUserRedemptionRecordForUserResponse>;
    epochUnbondingRecord(request: QueryGetEpochUnbondingRecordRequest): Promise<QueryGetEpochUnbondingRecordResponse>;
    epochUnbondingRecordAll(request?: QueryAllEpochUnbondingRecordRequest): Promise<QueryAllEpochUnbondingRecordResponse>;
    depositRecord(request: QueryGetDepositRecordRequest): Promise<QueryGetDepositRecordResponse>;
    depositRecordAll(request?: QueryAllDepositRecordRequest): Promise<QueryAllDepositRecordResponse>;
    depositRecordByHost(request: QueryDepositRecordByHostRequest): Promise<QueryDepositRecordByHostResponse>;
    lSMDeposit(request: QueryLSMDepositRequest): Promise<QueryLSMDepositResponse>;
    lSMDeposits(request: QueryLSMDepositsRequest): Promise<QueryLSMDepositsResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    userRedemptionRecord(request: QueryGetUserRedemptionRecordRequest): Promise<QueryGetUserRedemptionRecordResponse>;
    userRedemptionRecordAll(request?: QueryAllUserRedemptionRecordRequest): Promise<QueryAllUserRedemptionRecordResponse>;
    userRedemptionRecordForUser(request: QueryAllUserRedemptionRecordForUserRequest): Promise<QueryAllUserRedemptionRecordForUserResponse>;
    epochUnbondingRecord(request: QueryGetEpochUnbondingRecordRequest): Promise<QueryGetEpochUnbondingRecordResponse>;
    epochUnbondingRecordAll(request?: QueryAllEpochUnbondingRecordRequest): Promise<QueryAllEpochUnbondingRecordResponse>;
    depositRecord(request: QueryGetDepositRecordRequest): Promise<QueryGetDepositRecordResponse>;
    depositRecordAll(request?: QueryAllDepositRecordRequest): Promise<QueryAllDepositRecordResponse>;
    depositRecordByHost(request: QueryDepositRecordByHostRequest): Promise<QueryDepositRecordByHostResponse>;
    lSMDeposit(request: QueryLSMDepositRequest): Promise<QueryLSMDepositResponse>;
    lSMDeposits(request: QueryLSMDepositsRequest): Promise<QueryLSMDepositsResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map