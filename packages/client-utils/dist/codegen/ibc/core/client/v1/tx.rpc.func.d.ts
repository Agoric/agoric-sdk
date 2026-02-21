import { MsgCreateClient, MsgUpdateClient, MsgUpgradeClient, MsgSubmitMisbehaviour, MsgRecoverClient, MsgIBCSoftwareUpgrade, MsgUpdateParams } from '@agoric/cosmic-proto/codegen/ibc/core/client/v1/tx.js';
/**
 * CreateClient defines a rpc handler method for MsgCreateClient.
 * @name createClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.CreateClient
 */
export declare const createClient: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateClient | MsgCreateClient[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateClient defines a rpc handler method for MsgUpdateClient.
 * @name updateClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpdateClient
 */
export declare const updateClient: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateClient | MsgUpdateClient[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpgradeClient defines a rpc handler method for MsgUpgradeClient.
 * @name upgradeClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpgradeClient
 */
export declare const upgradeClient: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpgradeClient | MsgUpgradeClient[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * SubmitMisbehaviour defines a rpc handler method for MsgSubmitMisbehaviour.
 * @name submitMisbehaviour
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.SubmitMisbehaviour
 */
export declare const submitMisbehaviour: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSubmitMisbehaviour | MsgSubmitMisbehaviour[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * RecoverClient defines a rpc handler method for MsgRecoverClient.
 * @name recoverClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.RecoverClient
 */
export declare const recoverClient: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRecoverClient | MsgRecoverClient[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * IBCSoftwareUpgrade defines a rpc handler method for MsgIBCSoftwareUpgrade.
 * @name iBCSoftwareUpgrade
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.IBCSoftwareUpgrade
 */
export declare const iBCSoftwareUpgrade: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgIBCSoftwareUpgrade | MsgIBCSoftwareUpgrade[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateClientParams defines a rpc handler method for MsgUpdateParams.
 * @name updateClientParams
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpdateClientParams
 */
export declare const updateClientParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map