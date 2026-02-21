import { MsgSend, MsgMultiSend, MsgUpdateParams, MsgSetSendEnabled } from '@agoric/cosmic-proto/codegen/cosmos/bank/v1beta1/tx.js';
/**
 * Send defines a method for sending coins from one account to another account.
 * @name send
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.Send
 */
export declare const send: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSend | MsgSend[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * MultiSend defines a method for sending coins from some accounts to other accounts.
 * @name multiSend
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.MultiSend
 */
export declare const multiSend: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgMultiSend | MsgMultiSend[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateParams defines a governance operation for updating the x/bank module parameters.
 * The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * SetSendEnabled is a governance operation for setting the SendEnabled flag
 * on any number of Denoms. Only the entries to add or update should be
 * included. Entries that already exist in the store, but that aren't
 * included in this message, will be left unchanged.
 *
 * Since: cosmos-sdk 0.47
 * @name setSendEnabled
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SetSendEnabled
 */
export declare const setSendEnabled: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSetSendEnabled | MsgSetSendEnabled[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map