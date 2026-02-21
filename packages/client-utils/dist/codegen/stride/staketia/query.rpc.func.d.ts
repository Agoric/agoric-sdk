import { QueryHostZoneRequest, QueryHostZoneResponse, QueryDelegationRecordsRequest, QueryDelegationRecordsResponse, QueryUnbondingRecordsRequest, QueryUnbondingRecordsResponse, QueryRedemptionRecordRequest, QueryRedemptionRecordResponse, QueryRedemptionRecordsRequest, QueryRedemptionRecordsResponse, QuerySlashRecordsRequest, QuerySlashRecordsResponse } from '@agoric/cosmic-proto/codegen/stride/staketia/query.js';
/**
 * Queries the host zone struct
 * @name getHostZone
 * @package stride.staketia
 * @see proto service: stride.staketia.HostZone
 */
export declare const getHostZone: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryHostZoneRequest) => Promise<QueryHostZoneResponse>;
/**
 * Queries the delegation records with an optional to include archived records
 * Ex:
 * - /delegation_records
 * - /delegation_records?include_archived=true
 * @name getDelegationRecords
 * @package stride.staketia
 * @see proto service: stride.staketia.DelegationRecords
 */
export declare const getDelegationRecords: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDelegationRecordsRequest) => Promise<QueryDelegationRecordsResponse>;
/**
 * Queries the unbonding records with an optional to include archived records
 * Ex:
 * - /unbonding_records
 * - /unbonding_records?include_archived=true
 * @name getUnbondingRecords
 * @package stride.staketia
 * @see proto service: stride.staketia.UnbondingRecords
 */
export declare const getUnbondingRecords: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryUnbondingRecordsRequest) => Promise<QueryUnbondingRecordsResponse>;
/**
 * Queries a single user redemption record
 * @name getRedemptionRecord
 * @package stride.staketia
 * @see proto service: stride.staketia.RedemptionRecord
 */
export declare const getRedemptionRecord: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryRedemptionRecordRequest) => Promise<QueryRedemptionRecordResponse>;
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
export declare const getRedemptionRecords: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryRedemptionRecordsRequest) => Promise<QueryRedemptionRecordsResponse>;
/**
 * Queries slash records
 * @name getSlashRecords
 * @package stride.staketia
 * @see proto service: stride.staketia.SlashRecords
 */
export declare const getSlashRecords: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QuerySlashRecordsRequest) => Promise<QuerySlashRecordsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map