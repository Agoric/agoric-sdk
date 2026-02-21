import { MsgUpdateParams, MsgModuleQuerySafe } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/host/v1/tx.js';
/**
 * UpdateParams defines a rpc handler for MsgUpdateParams.
 * @name updateParams
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto service: ibc.applications.interchain_accounts.host.v1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ModuleQuerySafe defines a rpc handler for MsgModuleQuerySafe.
 * @name moduleQuerySafe
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto service: ibc.applications.interchain_accounts.host.v1.ModuleQuerySafe
 */
export declare const moduleQuerySafe: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgModuleQuerySafe | MsgModuleQuerySafe[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map