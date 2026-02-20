//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
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
} from '@agoric/cosmic-proto/codegen/cosmos/tx/v1beta1/service.js';
/**
 * Simulate simulates executing a transaction for estimating gas usage.
 * @name getSimulate
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.Simulate
 */
export const getSimulate = buildQuery<SimulateRequest, SimulateResponse>({
  encode: SimulateRequest.encode,
  decode: SimulateResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'Simulate',
  deps: [SimulateRequest, SimulateResponse],
});
/**
 * GetTx fetches a tx by hash.
 * @name getGetTx
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.GetTx
 */
export const getGetTx = buildQuery<GetTxRequest, GetTxResponse>({
  encode: GetTxRequest.encode,
  decode: GetTxResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'GetTx',
  deps: [GetTxRequest, GetTxResponse],
});
/**
 * BroadcastTx broadcast transaction.
 * @name getBroadcastTx
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.BroadcastTx
 */
export const getBroadcastTx = buildQuery<
  BroadcastTxRequest,
  BroadcastTxResponse
>({
  encode: BroadcastTxRequest.encode,
  decode: BroadcastTxResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'BroadcastTx',
  deps: [BroadcastTxRequest, BroadcastTxResponse],
});
/**
 * GetTxsEvent fetches txs by event.
 * @name getGetTxsEvent
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.GetTxsEvent
 */
export const getGetTxsEvent = buildQuery<
  GetTxsEventRequest,
  GetTxsEventResponse
>({
  encode: GetTxsEventRequest.encode,
  decode: GetTxsEventResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'GetTxsEvent',
  deps: [GetTxsEventRequest, GetTxsEventResponse],
});
/**
 * GetBlockWithTxs fetches a block with decoded txs.
 *
 * Since: cosmos-sdk 0.45.2
 * @name getGetBlockWithTxs
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.GetBlockWithTxs
 */
export const getGetBlockWithTxs = buildQuery<
  GetBlockWithTxsRequest,
  GetBlockWithTxsResponse
>({
  encode: GetBlockWithTxsRequest.encode,
  decode: GetBlockWithTxsResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'GetBlockWithTxs',
  deps: [GetBlockWithTxsRequest, GetBlockWithTxsResponse],
});
/**
 * TxDecode decodes the transaction.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxDecode
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxDecode
 */
export const getTxDecode = buildQuery<TxDecodeRequest, TxDecodeResponse>({
  encode: TxDecodeRequest.encode,
  decode: TxDecodeResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'TxDecode',
  deps: [TxDecodeRequest, TxDecodeResponse],
});
/**
 * TxEncode encodes the transaction.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxEncode
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxEncode
 */
export const getTxEncode = buildQuery<TxEncodeRequest, TxEncodeResponse>({
  encode: TxEncodeRequest.encode,
  decode: TxEncodeResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'TxEncode',
  deps: [TxEncodeRequest, TxEncodeResponse],
});
/**
 * TxEncodeAmino encodes an Amino transaction from JSON to encoded bytes.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxEncodeAmino
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxEncodeAmino
 */
export const getTxEncodeAmino = buildQuery<
  TxEncodeAminoRequest,
  TxEncodeAminoResponse
>({
  encode: TxEncodeAminoRequest.encode,
  decode: TxEncodeAminoResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'TxEncodeAmino',
  deps: [TxEncodeAminoRequest, TxEncodeAminoResponse],
});
/**
 * TxDecodeAmino decodes an Amino transaction from encoded bytes to JSON.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxDecodeAmino
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxDecodeAmino
 */
export const getTxDecodeAmino = buildQuery<
  TxDecodeAminoRequest,
  TxDecodeAminoResponse
>({
  encode: TxDecodeAminoRequest.encode,
  decode: TxDecodeAminoResponse.decode,
  service: 'cosmos.tx.v1beta1.Service',
  method: 'TxDecodeAmino',
  deps: [TxDecodeAminoRequest, TxDecodeAminoResponse],
});
