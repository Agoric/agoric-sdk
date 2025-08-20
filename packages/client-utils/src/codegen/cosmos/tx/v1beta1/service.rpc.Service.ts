//@ts-nocheck
import { type Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  SimulateRequest,
  SimulateResponse,
  GetTxRequest,
  GetTxResponse,
  BroadcastTxRequest,
  BroadcastTxResponse,
  GetTxsEventRequest,
  GetTxsEventResponse,
  GetBlockWithTxsRequest,
  GetBlockWithTxsResponse,
  TxDecodeRequest,
  TxDecodeResponse,
  TxEncodeRequest,
  TxEncodeResponse,
  TxEncodeAminoRequest,
  TxEncodeAminoResponse,
  TxDecodeAminoRequest,
  TxDecodeAminoResponse,
} from './service.js';
/** Service defines a gRPC service for interacting with transactions. */
export interface Service {
  /** Simulate simulates executing a transaction for estimating gas usage. */
  simulate(request: SimulateRequest): Promise<SimulateResponse>;
  /** GetTx fetches a tx by hash. */
  getTx(request: GetTxRequest): Promise<GetTxResponse>;
  /** BroadcastTx broadcast transaction. */
  broadcastTx(request: BroadcastTxRequest): Promise<BroadcastTxResponse>;
  /** GetTxsEvent fetches txs by event. */
  getTxsEvent(request: GetTxsEventRequest): Promise<GetTxsEventResponse>;
  /**
   * GetBlockWithTxs fetches a block with decoded txs.
   *
   * Since: cosmos-sdk 0.45.2
   */
  getBlockWithTxs(
    request: GetBlockWithTxsRequest,
  ): Promise<GetBlockWithTxsResponse>;
  /**
   * TxDecode decodes the transaction.
   *
   * Since: cosmos-sdk 0.47
   */
  txDecode(request: TxDecodeRequest): Promise<TxDecodeResponse>;
  /**
   * TxEncode encodes the transaction.
   *
   * Since: cosmos-sdk 0.47
   */
  txEncode(request: TxEncodeRequest): Promise<TxEncodeResponse>;
  /**
   * TxEncodeAmino encodes an Amino transaction from JSON to encoded bytes.
   *
   * Since: cosmos-sdk 0.47
   */
  txEncodeAmino(request: TxEncodeAminoRequest): Promise<TxEncodeAminoResponse>;
  /**
   * TxDecodeAmino decodes an Amino transaction from encoded bytes to JSON.
   *
   * Since: cosmos-sdk 0.47
   */
  txDecodeAmino(request: TxDecodeAminoRequest): Promise<TxDecodeAminoResponse>;
}
export class ServiceClientImpl implements Service {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.simulate = this.simulate.bind(this);
    this.getTx = this.getTx.bind(this);
    this.broadcastTx = this.broadcastTx.bind(this);
    this.getTxsEvent = this.getTxsEvent.bind(this);
    this.getBlockWithTxs = this.getBlockWithTxs.bind(this);
    this.txDecode = this.txDecode.bind(this);
    this.txEncode = this.txEncode.bind(this);
    this.txEncodeAmino = this.txEncodeAmino.bind(this);
    this.txDecodeAmino = this.txDecodeAmino.bind(this);
  }
  simulate(request: SimulateRequest): Promise<SimulateResponse> {
    const data = SimulateRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'Simulate',
      data,
    );
    return promise.then(data =>
      SimulateResponse.decode(new BinaryReader(data)),
    );
  }
  getTx(request: GetTxRequest): Promise<GetTxResponse> {
    const data = GetTxRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'GetTx',
      data,
    );
    return promise.then(data => GetTxResponse.decode(new BinaryReader(data)));
  }
  broadcastTx(request: BroadcastTxRequest): Promise<BroadcastTxResponse> {
    const data = BroadcastTxRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'BroadcastTx',
      data,
    );
    return promise.then(data =>
      BroadcastTxResponse.decode(new BinaryReader(data)),
    );
  }
  getTxsEvent(request: GetTxsEventRequest): Promise<GetTxsEventResponse> {
    const data = GetTxsEventRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'GetTxsEvent',
      data,
    );
    return promise.then(data =>
      GetTxsEventResponse.decode(new BinaryReader(data)),
    );
  }
  getBlockWithTxs(
    request: GetBlockWithTxsRequest,
  ): Promise<GetBlockWithTxsResponse> {
    const data = GetBlockWithTxsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'GetBlockWithTxs',
      data,
    );
    return promise.then(data =>
      GetBlockWithTxsResponse.decode(new BinaryReader(data)),
    );
  }
  txDecode(request: TxDecodeRequest): Promise<TxDecodeResponse> {
    const data = TxDecodeRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'TxDecode',
      data,
    );
    return promise.then(data =>
      TxDecodeResponse.decode(new BinaryReader(data)),
    );
  }
  txEncode(request: TxEncodeRequest): Promise<TxEncodeResponse> {
    const data = TxEncodeRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'TxEncode',
      data,
    );
    return promise.then(data =>
      TxEncodeResponse.decode(new BinaryReader(data)),
    );
  }
  txEncodeAmino(request: TxEncodeAminoRequest): Promise<TxEncodeAminoResponse> {
    const data = TxEncodeAminoRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'TxEncodeAmino',
      data,
    );
    return promise.then(data =>
      TxEncodeAminoResponse.decode(new BinaryReader(data)),
    );
  }
  txDecodeAmino(request: TxDecodeAminoRequest): Promise<TxDecodeAminoResponse> {
    const data = TxDecodeAminoRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.tx.v1beta1.Service',
      'TxDecodeAmino',
      data,
    );
    return promise.then(data =>
      TxDecodeAminoResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new ServiceClientImpl(rpc);
  return {
    simulate(request: SimulateRequest): Promise<SimulateResponse> {
      return queryService.simulate(request);
    },
    getTx(request: GetTxRequest): Promise<GetTxResponse> {
      return queryService.getTx(request);
    },
    broadcastTx(request: BroadcastTxRequest): Promise<BroadcastTxResponse> {
      return queryService.broadcastTx(request);
    },
    getTxsEvent(request: GetTxsEventRequest): Promise<GetTxsEventResponse> {
      return queryService.getTxsEvent(request);
    },
    getBlockWithTxs(
      request: GetBlockWithTxsRequest,
    ): Promise<GetBlockWithTxsResponse> {
      return queryService.getBlockWithTxs(request);
    },
    txDecode(request: TxDecodeRequest): Promise<TxDecodeResponse> {
      return queryService.txDecode(request);
    },
    txEncode(request: TxEncodeRequest): Promise<TxEncodeResponse> {
      return queryService.txEncode(request);
    },
    txEncodeAmino(
      request: TxEncodeAminoRequest,
    ): Promise<TxEncodeAminoResponse> {
      return queryService.txEncodeAmino(request);
    },
    txDecodeAmino(
      request: TxDecodeAminoRequest,
    ): Promise<TxDecodeAminoResponse> {
      return queryService.txDecodeAmino(request);
    },
  };
};
