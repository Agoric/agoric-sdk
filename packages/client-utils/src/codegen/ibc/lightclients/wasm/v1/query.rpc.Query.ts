//@ts-nocheck
import { type Rpc } from '../../../../helpers.js';
import { BinaryReader } from '../../../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryChecksumsRequest,
  QueryChecksumsResponse,
  QueryCodeRequest,
  QueryCodeResponse,
} from './query.js';
/** Query service for wasm module */
export interface Query {
  /** Get all Wasm checksums */
  checksums(request?: QueryChecksumsRequest): Promise<QueryChecksumsResponse>;
  /** Get Wasm code for given checksum */
  code(request: QueryCodeRequest): Promise<QueryCodeResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.checksums = this.checksums.bind(this);
    this.code = this.code.bind(this);
  }
  checksums(
    request: QueryChecksumsRequest = {
      pagination: undefined,
    },
  ): Promise<QueryChecksumsResponse> {
    const data = QueryChecksumsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.lightclients.wasm.v1.Query',
      'Checksums',
      data,
    );
    return promise.then(data =>
      QueryChecksumsResponse.decode(new BinaryReader(data)),
    );
  }
  code(request: QueryCodeRequest): Promise<QueryCodeResponse> {
    const data = QueryCodeRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.lightclients.wasm.v1.Query',
      'Code',
      data,
    );
    return promise.then(data =>
      QueryCodeResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    checksums(
      request?: QueryChecksumsRequest,
    ): Promise<QueryChecksumsResponse> {
      return queryService.checksums(request);
    },
    code(request: QueryCodeRequest): Promise<QueryCodeResponse> {
      return queryService.code(request);
    },
  };
};
