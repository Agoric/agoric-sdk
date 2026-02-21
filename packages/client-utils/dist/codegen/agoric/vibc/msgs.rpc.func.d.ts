import { MsgSendPacket } from '@agoric/cosmic-proto/codegen/agoric/vibc/msgs.js';
/**
 * Force sending an arbitrary packet on a channel.
 * @name sendPacket
 * @package agoric.vibc
 * @see proto service: agoric.vibc.SendPacket
 */
export declare const sendPacket: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSendPacket | MsgSendPacket[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=msgs.rpc.func.d.ts.map