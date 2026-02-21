import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/cosmos/mint/v1beta1/tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/mint module
 * parameters. The authority is defaults to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.mint.v1beta1
 * @see proto service: cosmos.mint.v1beta1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map