import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryHostZoneRequest, QueryHostZoneResponse, QueryDelegationRecordsRequest, QueryDelegationRecordsResponse, QueryUnbondingRecordsRequest, QueryUnbondingRecordsResponse, QueryRedemptionRecordRequest, QueryRedemptionRecordResponse, QueryRedemptionRecordsRequest, QueryRedemptionRecordsResponse, QuerySlashRecordsRequest, QuerySlashRecordsResponse } from '@agoric/cosmic-proto/codegen/stride/staketia/query.js';
/** Query defines the gRPC querier service. */
export interface Query {
    /** Queries the host zone struct */
    hostZone(request?: QueryHostZoneRequest): Promise<QueryHostZoneResponse>;
    /**
     * Queries the delegation records with an optional to include archived records
     * Ex:
     * - /delegation_records
     * - /delegation_records?include_archived=true
     */
    delegationRecords(request: QueryDelegationRecordsRequest): Promise<QueryDelegationRecordsResponse>;
    /**
     * Queries the unbonding records with an optional to include archived records
     * Ex:
     * - /unbonding_records
     * - /unbonding_records?include_archived=true
     */
    unbondingRecords(request: QueryUnbondingRecordsRequest): Promise<QueryUnbondingRecordsResponse>;
    /** Queries a single user redemption record */
    redemptionRecord(request: QueryRedemptionRecordRequest): Promise<QueryRedemptionRecordResponse>;
    /**
     * Queries all redemption records with optional filters
     * Ex:
     * - /redemption_records
     * - /redemption_records?address=strideXXX
     * - /redemption_records?unbonding_record_id=100
     */
    redemptionRecords(request: QueryRedemptionRecordsRequest): Promise<QueryRedemptionRecordsResponse>;
    /** Queries slash records */
    slashRecords(request?: QuerySlashRecordsRequest): Promise<QuerySlashRecordsResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    hostZone(request?: QueryHostZoneRequest): Promise<QueryHostZoneResponse>;
    delegationRecords(request: QueryDelegationRecordsRequest): Promise<QueryDelegationRecordsResponse>;
    unbondingRecords(request: QueryUnbondingRecordsRequest): Promise<QueryUnbondingRecordsResponse>;
    redemptionRecord(request: QueryRedemptionRecordRequest): Promise<QueryRedemptionRecordResponse>;
    redemptionRecords(request: QueryRedemptionRecordsRequest): Promise<QueryRedemptionRecordsResponse>;
    slashRecords(request?: QuerySlashRecordsRequest): Promise<QuerySlashRecordsResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    hostZone(request?: QueryHostZoneRequest): Promise<QueryHostZoneResponse>;
    delegationRecords(request: QueryDelegationRecordsRequest): Promise<QueryDelegationRecordsResponse>;
    unbondingRecords(request: QueryUnbondingRecordsRequest): Promise<QueryUnbondingRecordsResponse>;
    redemptionRecord(request: QueryRedemptionRecordRequest): Promise<QueryRedemptionRecordResponse>;
    redemptionRecords(request: QueryRedemptionRecordsRequest): Promise<QueryRedemptionRecordsResponse>;
    slashRecords(request?: QuerySlashRecordsRequest): Promise<QuerySlashRecordsResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map