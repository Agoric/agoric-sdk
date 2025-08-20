//@ts-nocheck
import { type Rpc } from '../../helpers.js';
import { BinaryReader } from '../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryEpochsInfoRequest,
  QueryEpochsInfoResponse,
  QueryCurrentEpochRequest,
  QueryCurrentEpochResponse,
  QueryEpochInfoRequest,
  QueryEpochInfoResponse,
} from './query.js';
/** Query defines the gRPC querier service. */
export interface Query {
  /** EpochInfos provide running epochInfos */
  epochInfos(
    request?: QueryEpochsInfoRequest,
  ): Promise<QueryEpochsInfoResponse>;
  /** CurrentEpoch provide current epoch of specified identifier */
  currentEpoch(
    request: QueryCurrentEpochRequest,
  ): Promise<QueryCurrentEpochResponse>;
  /** CurrentEpoch provide current epoch of specified identifier */
  epochInfo(request: QueryEpochInfoRequest): Promise<QueryEpochInfoResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.epochInfos = this.epochInfos.bind(this);
    this.currentEpoch = this.currentEpoch.bind(this);
    this.epochInfo = this.epochInfo.bind(this);
  }
  epochInfos(
    request: QueryEpochsInfoRequest = {
      pagination: undefined,
    },
  ): Promise<QueryEpochsInfoResponse> {
    const data = QueryEpochsInfoRequest.encode(request).finish();
    const promise = this.rpc.request('stride.epochs.Query', 'EpochInfos', data);
    return promise.then(data =>
      QueryEpochsInfoResponse.decode(new BinaryReader(data)),
    );
  }
  currentEpoch(
    request: QueryCurrentEpochRequest,
  ): Promise<QueryCurrentEpochResponse> {
    const data = QueryCurrentEpochRequest.encode(request).finish();
    const promise = this.rpc.request(
      'stride.epochs.Query',
      'CurrentEpoch',
      data,
    );
    return promise.then(data =>
      QueryCurrentEpochResponse.decode(new BinaryReader(data)),
    );
  }
  epochInfo(request: QueryEpochInfoRequest): Promise<QueryEpochInfoResponse> {
    const data = QueryEpochInfoRequest.encode(request).finish();
    const promise = this.rpc.request('stride.epochs.Query', 'EpochInfo', data);
    return promise.then(data =>
      QueryEpochInfoResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    epochInfos(
      request?: QueryEpochsInfoRequest,
    ): Promise<QueryEpochsInfoResponse> {
      return queryService.epochInfos(request);
    },
    currentEpoch(
      request: QueryCurrentEpochRequest,
    ): Promise<QueryCurrentEpochResponse> {
      return queryService.currentEpoch(request);
    },
    epochInfo(request: QueryEpochInfoRequest): Promise<QueryEpochInfoResponse> {
      return queryService.epochInfo(request);
    },
  };
};
