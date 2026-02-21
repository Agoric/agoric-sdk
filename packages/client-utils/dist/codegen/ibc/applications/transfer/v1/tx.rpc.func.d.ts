import { MsgTransfer, MsgUpdateParams } from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/tx.js';
/**
 * Transfer defines a rpc handler method for MsgTransfer.
 * @name transfer
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.Transfer
 */
export declare const transfer: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgTransfer | MsgTransfer[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateParams defines a rpc handler for MsgUpdateParams.
 * @name updateParams
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map