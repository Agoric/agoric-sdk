//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryHostZoneRequest, QueryHostZoneResponse, QueryDelegationRecordsRequest, QueryDelegationRecordsResponse, QueryUnbondingRecordsRequest, QueryUnbondingRecordsResponse, QueryRedemptionRecordRequest, QueryRedemptionRecordResponse, QueryRedemptionRecordsRequest, QueryRedemptionRecordsResponse, QuerySlashRecordsRequest, QuerySlashRecordsResponse, } from '@agoric/cosmic-proto/codegen/stride/stakedym/query.js';
/**
 * Queries the host zone struct
 * @name getHostZone
 * @package stride.stakedym
 * @see proto service: stride.stakedym.HostZone
 */
export const getHostZone = buildQuery({
    encode: QueryHostZoneRequest.encode,
    decode: QueryHostZoneResponse.decode,
    service: 'stride.stakedym.Query',
    method: 'HostZone',
    deps: [QueryHostZoneRequest, QueryHostZoneResponse],
});
/**
 * Queries the delegation records with an optional to include archived records
 * Ex:
 * - /delegation_records
 * - /delegation_records?include_archived=true
 * @name getDelegationRecords
 * @package stride.stakedym
 * @see proto service: stride.stakedym.DelegationRecords
 */
export const getDelegationRecords = buildQuery({
    encode: QueryDelegationRecordsRequest.encode,
    decode: QueryDelegationRecordsResponse.decode,
    service: 'stride.stakedym.Query',
    method: 'DelegationRecords',
    deps: [QueryDelegationRecordsRequest, QueryDelegationRecordsResponse],
});
/**
 * Queries the unbonding records with an optional to include archived records
 * Ex:
 * - /unbonding_records
 * - /unbonding_records?include_archived=true
 * @name getUnbondingRecords
 * @package stride.stakedym
 * @see proto service: stride.stakedym.UnbondingRecords
 */
export const getUnbondingRecords = buildQuery({
    encode: QueryUnbondingRecordsRequest.encode,
    decode: QueryUnbondingRecordsResponse.decode,
    service: 'stride.stakedym.Query',
    method: 'UnbondingRecords',
    deps: [QueryUnbondingRecordsRequest, QueryUnbondingRecordsResponse],
});
/**
 * Queries a single user redemption record
 * @name getRedemptionRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.RedemptionRecord
 */
export const getRedemptionRecord = buildQuery({
    encode: QueryRedemptionRecordRequest.encode,
    decode: QueryRedemptionRecordResponse.decode,
    service: 'stride.stakedym.Query',
    method: 'RedemptionRecord',
    deps: [QueryRedemptionRecordRequest, QueryRedemptionRecordResponse],
});
/**
 * Queries all redemption records with optional filters
 * Ex:
 * - /redemption_records
 * - /redemption_records?address=strideXXX
 * - /redemption_records?unbonding_record_id=100
 * @name getRedemptionRecords
 * @package stride.stakedym
 * @see proto service: stride.stakedym.RedemptionRecords
 */
export const getRedemptionRecords = buildQuery({
    encode: QueryRedemptionRecordsRequest.encode,
    decode: QueryRedemptionRecordsResponse.decode,
    service: 'stride.stakedym.Query',
    method: 'RedemptionRecords',
    deps: [QueryRedemptionRecordsRequest, QueryRedemptionRecordsResponse],
});
/**
 * Queries slash records
 * @name getSlashRecords
 * @package stride.stakedym
 * @see proto service: stride.stakedym.SlashRecords
 */
export const getSlashRecords = buildQuery({
    encode: QuerySlashRecordsRequest.encode,
    decode: QuerySlashRecordsResponse.decode,
    service: 'stride.stakedym.Query',
    method: 'SlashRecords',
    deps: [QuerySlashRecordsRequest, QuerySlashRecordsResponse],
});
//# sourceMappingURL=query.rpc.func.js.map