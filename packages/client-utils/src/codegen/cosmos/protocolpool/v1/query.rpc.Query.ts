//@ts-nocheck
import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryCommunityPoolRequest,
  QueryCommunityPoolResponse,
  QueryContinuousFundRequest,
  QueryContinuousFundResponse,
  QueryContinuousFundsRequest,
  QueryContinuousFundsResponse,
  QueryParamsRequest,
  QueryParamsResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/protocolpool/v1/query.js';
/** Query defines the gRPC querier service for community pool module. */
export interface Query {
  /** CommunityPool queries the community pool coins. */
  communityPool(
    request?: QueryCommunityPoolRequest,
  ): Promise<QueryCommunityPoolResponse>;
  /** ContinuousFund queries a continuous fund by the recipient is is associated with. */
  continuousFund(
    request: QueryContinuousFundRequest,
  ): Promise<QueryContinuousFundResponse>;
  /** ContinuousFunds queries all continuous funds in the store. */
  continuousFunds(
    request?: QueryContinuousFundsRequest,
  ): Promise<QueryContinuousFundsResponse>;
  /** Params returns the total set of x/protocolpool parameters. */
  params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.communityPool = this.communityPool.bind(this);
    this.continuousFund = this.continuousFund.bind(this);
    this.continuousFunds = this.continuousFunds.bind(this);
    this.params = this.params.bind(this);
  }
  communityPool(
    request: QueryCommunityPoolRequest = {},
  ): Promise<QueryCommunityPoolResponse> {
    const data = QueryCommunityPoolRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Query',
      'CommunityPool',
      data,
    );
    return promise.then(data =>
      QueryCommunityPoolResponse.decode(new BinaryReader(data)),
    );
  }
  continuousFund(
    request: QueryContinuousFundRequest,
  ): Promise<QueryContinuousFundResponse> {
    const data = QueryContinuousFundRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Query',
      'ContinuousFund',
      data,
    );
    return promise.then(data =>
      QueryContinuousFundResponse.decode(new BinaryReader(data)),
    );
  }
  continuousFunds(
    request: QueryContinuousFundsRequest = {},
  ): Promise<QueryContinuousFundsResponse> {
    const data = QueryContinuousFundsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Query',
      'ContinuousFunds',
      data,
    );
    return promise.then(data =>
      QueryContinuousFundsResponse.decode(new BinaryReader(data)),
    );
  }
  params(request: QueryParamsRequest = {}): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Query',
      'Params',
      data,
    );
    return promise.then(data =>
      QueryParamsResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    communityPool(
      request?: QueryCommunityPoolRequest,
    ): Promise<QueryCommunityPoolResponse> {
      return queryService.communityPool(request);
    },
    continuousFund(
      request: QueryContinuousFundRequest,
    ): Promise<QueryContinuousFundResponse> {
      return queryService.continuousFund(request);
    },
    continuousFunds(
      request?: QueryContinuousFundsRequest,
    ): Promise<QueryContinuousFundsResponse> {
      return queryService.continuousFunds(request);
    },
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse> {
      return queryService.params(request);
    },
  };
};
