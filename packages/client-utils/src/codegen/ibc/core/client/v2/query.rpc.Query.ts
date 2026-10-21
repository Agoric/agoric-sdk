//@ts-nocheck
import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryCounterpartyInfoRequest,
  QueryCounterpartyInfoResponse,
  QueryConfigRequest,
  QueryConfigResponse,
} from '@agoric/cosmic-proto/codegen/ibc/core/client/v2/query.js';
/** Query provides defines the gRPC querier service */
export interface Query {
  /** CounterpartyInfo queries an IBC light counter party info. */
  counterpartyInfo(
    request: QueryCounterpartyInfoRequest,
  ): Promise<QueryCounterpartyInfoResponse>;
  /** Config queries the IBC client v2 configuration for a given client. */
  config(request: QueryConfigRequest): Promise<QueryConfigResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.counterpartyInfo = this.counterpartyInfo.bind(this);
    this.config = this.config.bind(this);
  }
  counterpartyInfo(
    request: QueryCounterpartyInfoRequest,
  ): Promise<QueryCounterpartyInfoResponse> {
    const data = QueryCounterpartyInfoRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.client.v2.Query',
      'CounterpartyInfo',
      data,
    );
    return promise.then(data =>
      QueryCounterpartyInfoResponse.decode(new BinaryReader(data)),
    );
  }
  config(request: QueryConfigRequest): Promise<QueryConfigResponse> {
    const data = QueryConfigRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.client.v2.Query',
      'Config',
      data,
    );
    return promise.then(data =>
      QueryConfigResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    counterpartyInfo(
      request: QueryCounterpartyInfoRequest,
    ): Promise<QueryCounterpartyInfoResponse> {
      return queryService.counterpartyInfo(request);
    },
    config(request: QueryConfigRequest): Promise<QueryConfigResponse> {
      return queryService.config(request);
    },
  };
};
