//@ts-nocheck
import { Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryParamsRequest,
  QueryParamsResponse,
  QuerySubspacesRequest,
  QuerySubspacesResponse,
} from './query.js';
/** Query defines the gRPC querier service. */
export interface Query {
  /**
   * Params queries a specific parameter of a module, given its subspace and
   * key.
   */
  params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
  /**
   * Subspaces queries for all registered subspaces and all keys for a subspace.
   *
   * Since: cosmos-sdk 0.46
   */
  subspaces(request?: QuerySubspacesRequest): Promise<QuerySubspacesResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.params = this.params.bind(this);
    this.subspaces = this.subspaces.bind(this);
  }
  params(request: QueryParamsRequest): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.params.v1beta1.Query',
      'Params',
      data,
    );
    return promise.then(data =>
      QueryParamsResponse.decode(new BinaryReader(data)),
    );
  }
  subspaces(
    request: QuerySubspacesRequest = {},
  ): Promise<QuerySubspacesResponse> {
    const data = QuerySubspacesRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.params.v1beta1.Query',
      'Subspaces',
      data,
    );
    return promise.then(data =>
      QuerySubspacesResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    params(request: QueryParamsRequest): Promise<QueryParamsResponse> {
      return queryService.params(request);
    },
    subspaces(
      request?: QuerySubspacesRequest,
    ): Promise<QuerySubspacesResponse> {
      return queryService.subspaces(request);
    },
  };
};
