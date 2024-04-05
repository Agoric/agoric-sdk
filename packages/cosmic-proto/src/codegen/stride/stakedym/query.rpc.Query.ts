//@ts-nocheck
import { Rpc } from '../../helpers.js';
import { BinaryReader } from '../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
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
} from './query.js';
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
  delegationRecords(
    request: QueryDelegationRecordsRequest,
  ): Promise<QueryDelegationRecordsResponse>;
  /**
   * Queries the unbonding records with an optional to include archived records
   * Ex:
   * - /unbonding_records
   * - /unbonding_records?include_archived=true
   */
  unbondingRecords(
    request: QueryUnbondingRecordsRequest,
  ): Promise<QueryUnbondingRecordsResponse>;
  /** Queries a single user redemption record */
  redemptionRecord(
    request: QueryRedemptionRecordRequest,
  ): Promise<QueryRedemptionRecordResponse>;
  /**
   * Queries all redemption records with optional filters
   * Ex:
   * - /redemption_records
   * - /redemption_records?address=strideXXX
   * - /redemption_records?unbonding_record_id=100
   */
  redemptionRecords(
    request: QueryRedemptionRecordsRequest,
  ): Promise<QueryRedemptionRecordsResponse>;
  /** Queries slash records */
  slashRecords(
    request?: QuerySlashRecordsRequest,
  ): Promise<QuerySlashRecordsResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.hostZone = this.hostZone.bind(this);
    this.delegationRecords = this.delegationRecords.bind(this);
    this.unbondingRecords = this.unbondingRecords.bind(this);
    this.redemptionRecord = this.redemptionRecord.bind(this);
    this.redemptionRecords = this.redemptionRecords.bind(this);
    this.slashRecords = this.slashRecords.bind(this);
  }
  hostZone(request: QueryHostZoneRequest = {}): Promise<QueryHostZoneResponse> {
    const data = QueryHostZoneRequest.encode(request).finish();
    const promise = this.rpc.request('stride.stakedym.Query', 'HostZone', data);
    return promise.then(data =>
      QueryHostZoneResponse.decode(new BinaryReader(data)),
    );
  }
  delegationRecords(
    request: QueryDelegationRecordsRequest,
  ): Promise<QueryDelegationRecordsResponse> {
    const data = QueryDelegationRecordsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.stakedym.Query',
      'DelegationRecords',
      data,
    );
    return promise.then(data =>
      QueryDelegationRecordsResponse.decode(new BinaryReader(data)),
    );
  }
  unbondingRecords(
    request: QueryUnbondingRecordsRequest,
  ): Promise<QueryUnbondingRecordsResponse> {
    const data = QueryUnbondingRecordsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.stakedym.Query',
      'UnbondingRecords',
      data,
    );
    return promise.then(data =>
      QueryUnbondingRecordsResponse.decode(new BinaryReader(data)),
    );
  }
  redemptionRecord(
    request: QueryRedemptionRecordRequest,
  ): Promise<QueryRedemptionRecordResponse> {
    const data = QueryRedemptionRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.stakedym.Query',
      'RedemptionRecord',
      data,
    );
    return promise.then(data =>
      QueryRedemptionRecordResponse.decode(new BinaryReader(data)),
    );
  }
  redemptionRecords(
    request: QueryRedemptionRecordsRequest,
  ): Promise<QueryRedemptionRecordsResponse> {
    const data = QueryRedemptionRecordsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.stakedym.Query',
      'RedemptionRecords',
      data,
    );
    return promise.then(data =>
      QueryRedemptionRecordsResponse.decode(new BinaryReader(data)),
    );
  }
  slashRecords(
    request: QuerySlashRecordsRequest = {},
  ): Promise<QuerySlashRecordsResponse> {
    const data = QuerySlashRecordsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.stakedym.Query',
      'SlashRecords',
      data,
    );
    return promise.then(data =>
      QuerySlashRecordsResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    hostZone(request?: QueryHostZoneRequest): Promise<QueryHostZoneResponse> {
      return queryService.hostZone(request);
    },
    delegationRecords(
      request: QueryDelegationRecordsRequest,
    ): Promise<QueryDelegationRecordsResponse> {
      return queryService.delegationRecords(request);
    },
    unbondingRecords(
      request: QueryUnbondingRecordsRequest,
    ): Promise<QueryUnbondingRecordsResponse> {
      return queryService.unbondingRecords(request);
    },
    redemptionRecord(
      request: QueryRedemptionRecordRequest,
    ): Promise<QueryRedemptionRecordResponse> {
      return queryService.redemptionRecord(request);
    },
    redemptionRecords(
      request: QueryRedemptionRecordsRequest,
    ): Promise<QueryRedemptionRecordsResponse> {
      return queryService.redemptionRecords(request);
    },
    slashRecords(
      request?: QuerySlashRecordsRequest,
    ): Promise<QuerySlashRecordsResponse> {
      return queryService.slashRecords(request);
    },
  };
};
