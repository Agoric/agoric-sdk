//@ts-nocheck
import { Rpc } from '../../helpers.js';
import { BinaryReader } from '../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
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
/** Query defines the gRPC querier service. */
export interface Query {
  /** Parameters queries the parameters of the module. */
  params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
  /** Queries a UserRedemptionRecord by id. */
  userRedemptionRecord(
    request: QueryGetUserRedemptionRecordRequest,
  ): Promise<QueryGetUserRedemptionRecordResponse>;
  /** Queries a list of UserRedemptionRecord items. */
  userRedemptionRecordAll(
    request?: QueryAllUserRedemptionRecordRequest,
  ): Promise<QueryAllUserRedemptionRecordResponse>;
  /** Queries a list of UserRedemptionRecord items by chainId / userId pair. */
  userRedemptionRecordForUser(
    request: QueryAllUserRedemptionRecordForUserRequest,
  ): Promise<QueryAllUserRedemptionRecordForUserResponse>;
  /** Queries a EpochUnbondingRecord by id. */
  epochUnbondingRecord(
    request: QueryGetEpochUnbondingRecordRequest,
  ): Promise<QueryGetEpochUnbondingRecordResponse>;
  /** Queries a list of EpochUnbondingRecord items. */
  epochUnbondingRecordAll(
    request?: QueryAllEpochUnbondingRecordRequest,
  ): Promise<QueryAllEpochUnbondingRecordResponse>;
  /** Queries a DepositRecord by id. */
  depositRecord(
    request: QueryGetDepositRecordRequest,
  ): Promise<QueryGetDepositRecordResponse>;
  /** Queries a list of DepositRecord items. */
  depositRecordAll(
    request?: QueryAllDepositRecordRequest,
  ): Promise<QueryAllDepositRecordResponse>;
  /** Queries a list of DepositRecord items for a given host zone */
  depositRecordByHost(
    request: QueryDepositRecordByHostRequest,
  ): Promise<QueryDepositRecordByHostResponse>;
  /** Queries the existing LSMTokenDeposits for one specific deposit */
  lSMDeposit(request: QueryLSMDepositRequest): Promise<QueryLSMDepositResponse>;
  /**
   * Queries the existing LSMTokenDeposits for all which match filters
   *   intended use:
   *   ...stakeibc/lsm_deposits?chain_id=X&validator_address=Y&status=Z
   */
  lSMDeposits(
    request: QueryLSMDepositsRequest,
  ): Promise<QueryLSMDepositsResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.params = this.params.bind(this);
    this.userRedemptionRecord = this.userRedemptionRecord.bind(this);
    this.userRedemptionRecordAll = this.userRedemptionRecordAll.bind(this);
    this.userRedemptionRecordForUser =
      this.userRedemptionRecordForUser.bind(this);
    this.epochUnbondingRecord = this.epochUnbondingRecord.bind(this);
    this.epochUnbondingRecordAll = this.epochUnbondingRecordAll.bind(this);
    this.depositRecord = this.depositRecord.bind(this);
    this.depositRecordAll = this.depositRecordAll.bind(this);
    this.depositRecordByHost = this.depositRecordByHost.bind(this);
    this.lSMDeposit = this.lSMDeposit.bind(this);
    this.lSMDeposits = this.lSMDeposits.bind(this);
  }
  params(request: QueryParamsRequest = {}): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request('stride.records.Query', 'Params', data);
    return promise.then(data =>
      QueryParamsResponse.decode(new BinaryReader(data)),
    );
  }
  userRedemptionRecord(
    request: QueryGetUserRedemptionRecordRequest,
  ): Promise<QueryGetUserRedemptionRecordResponse> {
    const data = QueryGetUserRedemptionRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'UserRedemptionRecord',
      data,
    );
    return promise.then(data =>
      QueryGetUserRedemptionRecordResponse.decode(new BinaryReader(data)),
    );
  }
  userRedemptionRecordAll(
    request: QueryAllUserRedemptionRecordRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllUserRedemptionRecordResponse> {
    const data = QueryAllUserRedemptionRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'UserRedemptionRecordAll',
      data,
    );
    return promise.then(data =>
      QueryAllUserRedemptionRecordResponse.decode(new BinaryReader(data)),
    );
  }
  userRedemptionRecordForUser(
    request: QueryAllUserRedemptionRecordForUserRequest,
  ): Promise<QueryAllUserRedemptionRecordForUserResponse> {
    const data =
      QueryAllUserRedemptionRecordForUserRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'UserRedemptionRecordForUser',
      data,
    );
    return promise.then(data =>
      QueryAllUserRedemptionRecordForUserResponse.decode(
        new BinaryReader(data),
      ),
    );
  }
  epochUnbondingRecord(
    request: QueryGetEpochUnbondingRecordRequest,
  ): Promise<QueryGetEpochUnbondingRecordResponse> {
    const data = QueryGetEpochUnbondingRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'EpochUnbondingRecord',
      data,
    );
    return promise.then(data =>
      QueryGetEpochUnbondingRecordResponse.decode(new BinaryReader(data)),
    );
  }
  epochUnbondingRecordAll(
    request: QueryAllEpochUnbondingRecordRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllEpochUnbondingRecordResponse> {
    const data = QueryAllEpochUnbondingRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'EpochUnbondingRecordAll',
      data,
    );
    return promise.then(data =>
      QueryAllEpochUnbondingRecordResponse.decode(new BinaryReader(data)),
    );
  }
  depositRecord(
    request: QueryGetDepositRecordRequest,
  ): Promise<QueryGetDepositRecordResponse> {
    const data = QueryGetDepositRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'DepositRecord',
      data,
    );
    return promise.then(data =>
      QueryGetDepositRecordResponse.decode(new BinaryReader(data)),
    );
  }
  depositRecordAll(
    request: QueryAllDepositRecordRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllDepositRecordResponse> {
    const data = QueryAllDepositRecordRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'DepositRecordAll',
      data,
    );
    return promise.then(data =>
      QueryAllDepositRecordResponse.decode(new BinaryReader(data)),
    );
  }
  depositRecordByHost(
    request: QueryDepositRecordByHostRequest,
  ): Promise<QueryDepositRecordByHostResponse> {
    const data = QueryDepositRecordByHostRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'DepositRecordByHost',
      data,
    );
    return promise.then(data =>
      QueryDepositRecordByHostResponse.decode(new BinaryReader(data)),
    );
  }
  lSMDeposit(
    request: QueryLSMDepositRequest,
  ): Promise<QueryLSMDepositResponse> {
    const data = QueryLSMDepositRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'LSMDeposit',
      data,
    );
    return promise.then(data =>
      QueryLSMDepositResponse.decode(new BinaryReader(data)),
    );
  }
  lSMDeposits(
    request: QueryLSMDepositsRequest,
  ): Promise<QueryLSMDepositsResponse> {
    const data = QueryLSMDepositsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.records.Query',
      'LSMDeposits',
      data,
    );
    return promise.then(data =>
      QueryLSMDepositsResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse> {
      return queryService.params(request);
    },
    userRedemptionRecord(
      request: QueryGetUserRedemptionRecordRequest,
    ): Promise<QueryGetUserRedemptionRecordResponse> {
      return queryService.userRedemptionRecord(request);
    },
    userRedemptionRecordAll(
      request?: QueryAllUserRedemptionRecordRequest,
    ): Promise<QueryAllUserRedemptionRecordResponse> {
      return queryService.userRedemptionRecordAll(request);
    },
    userRedemptionRecordForUser(
      request: QueryAllUserRedemptionRecordForUserRequest,
    ): Promise<QueryAllUserRedemptionRecordForUserResponse> {
      return queryService.userRedemptionRecordForUser(request);
    },
    epochUnbondingRecord(
      request: QueryGetEpochUnbondingRecordRequest,
    ): Promise<QueryGetEpochUnbondingRecordResponse> {
      return queryService.epochUnbondingRecord(request);
    },
    epochUnbondingRecordAll(
      request?: QueryAllEpochUnbondingRecordRequest,
    ): Promise<QueryAllEpochUnbondingRecordResponse> {
      return queryService.epochUnbondingRecordAll(request);
    },
    depositRecord(
      request: QueryGetDepositRecordRequest,
    ): Promise<QueryGetDepositRecordResponse> {
      return queryService.depositRecord(request);
    },
    depositRecordAll(
      request?: QueryAllDepositRecordRequest,
    ): Promise<QueryAllDepositRecordResponse> {
      return queryService.depositRecordAll(request);
    },
    depositRecordByHost(
      request: QueryDepositRecordByHostRequest,
    ): Promise<QueryDepositRecordByHostResponse> {
      return queryService.depositRecordByHost(request);
    },
    lSMDeposit(
      request: QueryLSMDepositRequest,
    ): Promise<QueryLSMDepositResponse> {
      return queryService.lSMDeposit(request);
    },
    lSMDeposits(
      request: QueryLSMDepositsRequest,
    ): Promise<QueryLSMDepositsResponse> {
      return queryService.lSMDeposits(request);
    },
  };
};
