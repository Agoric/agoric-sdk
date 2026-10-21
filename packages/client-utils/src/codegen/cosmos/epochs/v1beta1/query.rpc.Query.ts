//@ts-nocheck
import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryEpochInfosRequest,
  QueryEpochInfosResponse,
  QueryCurrentEpochRequest,
  QueryCurrentEpochResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/epochs/v1beta1/query.js';
/** Query defines the gRPC querier service. */
export interface Query {
  /** EpochInfos provide running epochInfos */
  epochInfos(
    request?: QueryEpochInfosRequest,
  ): Promise<QueryEpochInfosResponse>;
  /** CurrentEpoch provide current epoch of specified identifier */
  currentEpoch(
    request: QueryCurrentEpochRequest,
  ): Promise<QueryCurrentEpochResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.epochInfos = this.epochInfos.bind(this);
    this.currentEpoch = this.currentEpoch.bind(this);
  }
  epochInfos(
    request: QueryEpochInfosRequest = {},
  ): Promise<QueryEpochInfosResponse> {
    const data = QueryEpochInfosRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.epochs.v1beta1.Query',
      'EpochInfos',
      data,
    );
    return promise.then(data =>
      QueryEpochInfosResponse.decode(new BinaryReader(data)),
    );
  }
  currentEpoch(
    request: QueryCurrentEpochRequest,
  ): Promise<QueryCurrentEpochResponse> {
    const data = QueryCurrentEpochRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.epochs.v1beta1.Query',
      'CurrentEpoch',
      data,
    );
    return promise.then(data =>
      QueryCurrentEpochResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    epochInfos(
      request?: QueryEpochInfosRequest,
    ): Promise<QueryEpochInfosResponse> {
      return queryService.epochInfos(request);
    },
    currentEpoch(
      request: QueryCurrentEpochRequest,
    ): Promise<QueryCurrentEpochResponse> {
      return queryService.currentEpoch(request);
    },
  };
};
