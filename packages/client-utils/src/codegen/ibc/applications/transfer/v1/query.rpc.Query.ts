//@ts-nocheck
import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryParamsRequest,
  QueryParamsResponse,
  QueryDenomsRequest,
  QueryDenomsResponse,
  QueryDenomRequest,
  QueryDenomResponse,
  QueryDenomHashRequest,
  QueryDenomHashResponse,
  QueryEscrowAddressRequest,
  QueryEscrowAddressResponse,
  QueryTotalEscrowForDenomRequest,
  QueryTotalEscrowForDenomResponse,
} from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/query.js';
/** Query provides defines the gRPC querier service. */
export interface Query {
  /** Params queries all parameters of the ibc-transfer module. */
  params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
  /** Denoms queries all denominations */
  denoms(request?: QueryDenomsRequest): Promise<QueryDenomsResponse>;
  /** Denom queries a denomination */
  denom(request: QueryDenomRequest): Promise<QueryDenomResponse>;
  /** DenomHash queries a denomination hash information. */
  denomHash(request: QueryDenomHashRequest): Promise<QueryDenomHashResponse>;
  /** EscrowAddress returns the escrow address for a particular port and channel id. */
  escrowAddress(
    request: QueryEscrowAddressRequest,
  ): Promise<QueryEscrowAddressResponse>;
  /** TotalEscrowForDenom returns the total amount of tokens in escrow based on the denom. */
  totalEscrowForDenom(
    request: QueryTotalEscrowForDenomRequest,
  ): Promise<QueryTotalEscrowForDenomResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.params = this.params.bind(this);
    this.denoms = this.denoms.bind(this);
    this.denom = this.denom.bind(this);
    this.denomHash = this.denomHash.bind(this);
    this.escrowAddress = this.escrowAddress.bind(this);
    this.totalEscrowForDenom = this.totalEscrowForDenom.bind(this);
  }
  params(request: QueryParamsRequest = {}): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.transfer.v1.Query',
      'Params',
      data,
    );
    return promise.then(data =>
      QueryParamsResponse.decode(new BinaryReader(data)),
    );
  }
  denoms(
    request: QueryDenomsRequest = {
      pagination: undefined,
    },
  ): Promise<QueryDenomsResponse> {
    const data = QueryDenomsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.transfer.v1.Query',
      'Denoms',
      data,
    );
    return promise.then(data =>
      QueryDenomsResponse.decode(new BinaryReader(data)),
    );
  }
  denom(request: QueryDenomRequest): Promise<QueryDenomResponse> {
    const data = QueryDenomRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.transfer.v1.Query',
      'Denom',
      data,
    );
    return promise.then(data =>
      QueryDenomResponse.decode(new BinaryReader(data)),
    );
  }
  denomHash(request: QueryDenomHashRequest): Promise<QueryDenomHashResponse> {
    const data = QueryDenomHashRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.transfer.v1.Query',
      'DenomHash',
      data,
    );
    return promise.then(data =>
      QueryDenomHashResponse.decode(new BinaryReader(data)),
    );
  }
  escrowAddress(
    request: QueryEscrowAddressRequest,
  ): Promise<QueryEscrowAddressResponse> {
    const data = QueryEscrowAddressRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.transfer.v1.Query',
      'EscrowAddress',
      data,
    );
    return promise.then(data =>
      QueryEscrowAddressResponse.decode(new BinaryReader(data)),
    );
  }
  totalEscrowForDenom(
    request: QueryTotalEscrowForDenomRequest,
  ): Promise<QueryTotalEscrowForDenomResponse> {
    const data = QueryTotalEscrowForDenomRequest.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.transfer.v1.Query',
      'TotalEscrowForDenom',
      data,
    );
    return promise.then(data =>
      QueryTotalEscrowForDenomResponse.decode(new BinaryReader(data)),
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
    denoms(request?: QueryDenomsRequest): Promise<QueryDenomsResponse> {
      return queryService.denoms(request);
    },
    denom(request: QueryDenomRequest): Promise<QueryDenomResponse> {
      return queryService.denom(request);
    },
    denomHash(request: QueryDenomHashRequest): Promise<QueryDenomHashResponse> {
      return queryService.denomHash(request);
    },
    escrowAddress(
      request: QueryEscrowAddressRequest,
    ): Promise<QueryEscrowAddressResponse> {
      return queryService.escrowAddress(request);
    },
    totalEscrowForDenom(
      request: QueryTotalEscrowForDenomRequest,
    ): Promise<QueryTotalEscrowForDenomResponse> {
      return queryService.totalEscrowForDenom(request);
    },
  };
};
