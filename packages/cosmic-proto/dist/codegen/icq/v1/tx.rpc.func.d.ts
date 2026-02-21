import { MsgUpdateParams } from './tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/async-icq module
 * parameters. The authority is hard-coded to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package icq.v1
 * @see proto service: icq.v1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map