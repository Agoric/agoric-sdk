import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/cosmos/auth/v1beta1/tx.js';
/**
 * UpdateParams defines a (governance) operation for updating the x/auth module
 * parameters. The authority defaults to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map