import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/cosmos/consensus/v1/tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/consensus module parameters.
 * The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.consensus.v1
 * @see proto service: cosmos.consensus.v1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map