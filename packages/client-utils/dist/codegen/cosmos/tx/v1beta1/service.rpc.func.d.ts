import { SimulateRequest, SimulateResponse, GetTxRequest, GetTxResponse, BroadcastTxRequest, BroadcastTxResponse, GetTxsEventRequest, GetTxsEventResponse, GetBlockWithTxsRequest, GetBlockWithTxsResponse, TxDecodeRequest, TxDecodeResponse, TxEncodeRequest, TxEncodeResponse, TxEncodeAminoRequest, TxEncodeAminoResponse, TxDecodeAminoRequest, TxDecodeAminoResponse } from '@agoric/cosmic-proto/codegen/cosmos/tx/v1beta1/service.js';
/**
 * Simulate simulates executing a transaction for estimating gas usage.
 * @name getSimulate
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.Simulate
 */
export declare const getSimulate: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: SimulateRequest) => Promise<SimulateResponse>;
/**
 * GetTx fetches a tx by hash.
 * @name getGetTx
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.GetTx
 */
export declare const getGetTx: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetTxRequest) => Promise<GetTxResponse>;
/**
 * BroadcastTx broadcast transaction.
 * @name getBroadcastTx
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.BroadcastTx
 */
export declare const getBroadcastTx: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: BroadcastTxRequest) => Promise<BroadcastTxResponse>;
/**
 * GetTxsEvent fetches txs by event.
 * @name getGetTxsEvent
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.GetTxsEvent
 */
export declare const getGetTxsEvent: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetTxsEventRequest) => Promise<GetTxsEventResponse>;
/**
 * GetBlockWithTxs fetches a block with decoded txs.
 *
 * Since: cosmos-sdk 0.45.2
 * @name getGetBlockWithTxs
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.GetBlockWithTxs
 */
export declare const getGetBlockWithTxs: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetBlockWithTxsRequest) => Promise<GetBlockWithTxsResponse>;
/**
 * TxDecode decodes the transaction.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxDecode
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxDecode
 */
export declare const getTxDecode: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: TxDecodeRequest) => Promise<TxDecodeResponse>;
/**
 * TxEncode encodes the transaction.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxEncode
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxEncode
 */
export declare const getTxEncode: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: TxEncodeRequest) => Promise<TxEncodeResponse>;
/**
 * TxEncodeAmino encodes an Amino transaction from JSON to encoded bytes.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxEncodeAmino
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxEncodeAmino
 */
export declare const getTxEncodeAmino: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: TxEncodeAminoRequest) => Promise<TxEncodeAminoResponse>;
/**
 * TxDecodeAmino decodes an Amino transaction from encoded bytes to JSON.
 *
 * Since: cosmos-sdk 0.47
 * @name getTxDecodeAmino
 * @package cosmos.tx.v1beta1
 * @see proto service: cosmos.tx.v1beta1.TxDecodeAmino
 */
export declare const getTxDecodeAmino: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: TxDecodeAminoRequest) => Promise<TxDecodeAminoResponse>;
//# sourceMappingURL=service.rpc.func.d.ts.map