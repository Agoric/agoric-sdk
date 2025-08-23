//@ts-nocheck
import { type Rpc } from '../../../../helpers.js';
import { BinaryReader } from '../../../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  ConfigRequest,
  ConfigResponse,
  StatusRequest,
  StatusResponse,
} from './query.js';
/** Service defines the gRPC querier service for node related queries. */
export interface Service {
  /** Config queries for the operator configuration. */
  config(request?: ConfigRequest): Promise<ConfigResponse>;
  /** Status queries for the node status. */
  status(request?: StatusRequest): Promise<StatusResponse>;
}
export class ServiceClientImpl implements Service {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.config = this.config.bind(this);
    this.status = this.status.bind(this);
  }
  config(request: ConfigRequest = {}): Promise<ConfigResponse> {
    const data = ConfigRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.base.node.v1beta1.Service',
      'Config',
      data,
    );
    return promise.then(data => ConfigResponse.decode(new BinaryReader(data)));
  }
  status(request: StatusRequest = {}): Promise<StatusResponse> {
    const data = StatusRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.base.node.v1beta1.Service',
      'Status',
      data,
    );
    return promise.then(data => StatusResponse.decode(new BinaryReader(data)));
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new ServiceClientImpl(rpc);
  return {
    config(request?: ConfigRequest): Promise<ConfigResponse> {
      return queryService.config(request);
    },
    status(request?: StatusRequest): Promise<StatusResponse> {
      return queryService.status(request);
    },
  };
};
