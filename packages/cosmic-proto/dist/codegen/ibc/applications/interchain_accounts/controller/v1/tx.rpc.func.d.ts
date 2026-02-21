import { MsgRegisterInterchainAccount, MsgSendTx, MsgUpdateParams } from './tx.js';
/**
 * RegisterInterchainAccount defines a rpc handler for MsgRegisterInterchainAccount.
 * @name registerInterchainAccount
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.RegisterInterchainAccount
 */
export declare const registerInterchainAccount: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRegisterInterchainAccount | MsgRegisterInterchainAccount[], fee: import("../../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * SendTx defines a rpc handler for MsgSendTx.
 * @name sendTx
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.SendTx
 */
export declare const sendTx: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSendTx | MsgSendTx[], fee: import("../../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateParams defines a rpc handler for MsgUpdateParams.
 * @name updateParams
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("../../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map