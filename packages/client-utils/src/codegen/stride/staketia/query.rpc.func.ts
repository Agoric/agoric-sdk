//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryHostZoneRequest,
  QueryHostZoneResponse,
  QueryDelegationRecordsRequest,
  QueryDelegationRecordsResponse,
  QueryUnbondingRecordsRequest,
  QueryUnbondingRecordsResponse,
  QueryRedemptionRecordRequest,
  QueryRedemptionRecordResponse,
  QueryRedemptionRecordsRequest,
  QueryRedemptionRecordsResponse,
  QuerySlashRecordsRequest,
  QuerySlashRecordsResponse,
} from '@agoric/cosmic-proto/codegen/stride/staketia/query.js';
/**
 * Queries the host zone struct
 * @name getHostZone
 * @package stride.staketia
 * @see proto service: stride.staketia.HostZone
 */
export const getHostZone = buildQuery<
  QueryHostZoneRequest,
  QueryHostZoneResponse
>({
  encode: QueryHostZoneRequest.encode,
  decode: QueryHostZoneResponse.decode,
  service: 'stride.staketia.Query',
  method: 'HostZone',
  deps: [QueryHostZoneRequest, QueryHostZoneResponse],
});
/**
 * Queries the delegation records with an optional to include archived records
 * Ex:
 * - /delegation_records
 * - /delegation_records?include_archived=true
 * @name getDelegationRecords
 * @package stride.staketia
 * @see proto service: stride.staketia.DelegationRecords
 */
export const getDelegationRecords = buildQuery<
  QueryDelegationRecordsRequest,
  QueryDelegationRecordsResponse
>({
  encode: QueryDelegationRecordsRequest.encode,
  decode: QueryDelegationRecordsResponse.decode,
  service: 'stride.staketia.Query',
  method: 'DelegationRecords',
  deps: [QueryDelegationRecordsRequest, QueryDelegationRecordsResponse],
});
/**
 * Queries the unbonding records with an optional to include archived records
 * Ex:
 * - /unbonding_records
 * - /unbonding_records?include_archived=true
 * @name getUnbondingRecords
 * @package stride.staketia
 * @see proto service: stride.staketia.UnbondingRecords
 */
export const getUnbondingRecords = buildQuery<
  QueryUnbondingRecordsRequest,
  QueryUnbondingRecordsResponse
>({
  encode: QueryUnbondingRecordsRequest.encode,
  decode: QueryUnbondingRecordsResponse.decode,
  service: 'stride.staketia.Query',
  method: 'UnbondingRecords',
  deps: [QueryUnbondingRecordsRequest, QueryUnbondingRecordsResponse],
});
/**
 * Queries a single user redemption record
 * @name getRedemptionRecord
 * @package stride.staketia
 * @see proto service: stride.staketia.RedemptionRecord
 */
export const getRedemptionRecord = buildQuery<
  QueryRedemptionRecordRequest,
  QueryRedemptionRecordResponse
>({
  encode: QueryRedemptionRecordRequest.encode,
  decode: QueryRedemptionRecordResponse.decode,
  service: 'stride.staketia.Query',
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
 * @package stride.staketia
 * @see proto service: stride.staketia.RedemptionRecords
 */
export const getRedemptionRecords = buildQuery<
  QueryRedemptionRecordsRequest,
  QueryRedemptionRecordsResponse
>({
  encode: QueryRedemptionRecordsRequest.encode,
  decode: QueryRedemptionRecordsResponse.decode,
  service: 'stride.staketia.Query',
  method: 'RedemptionRecords',
  deps: [QueryRedemptionRecordsRequest, QueryRedemptionRecordsResponse],
});
/**
 * Queries slash records
 * @name getSlashRecords
 * @package stride.staketia
 * @see proto service: stride.staketia.SlashRecords
 */
export const getSlashRecords = buildQuery<
  QuerySlashRecordsRequest,
  QuerySlashRecordsResponse
>({
  encode: QuerySlashRecordsRequest.encode,
  decode: QuerySlashRecordsResponse.decode,
  service: 'stride.staketia.Query',
  method: 'SlashRecords',
  deps: [QuerySlashRecordsRequest, QuerySlashRecordsResponse],
});
