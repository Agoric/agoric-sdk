import { MsgSoftwareUpgrade, MsgCancelUpgrade } from '@agoric/cosmic-proto/codegen/cosmos/upgrade/v1beta1/tx.js';
/**
 * SoftwareUpgrade is a governance operation for initiating a software upgrade.
 *
 * Since: cosmos-sdk 0.46
 * @name softwareUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.SoftwareUpgrade
 */
export declare const softwareUpgrade: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSoftwareUpgrade | MsgSoftwareUpgrade[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CancelUpgrade is a governance operation for cancelling a previously
 * approved software upgrade.
 *
 * Since: cosmos-sdk 0.46
 * @name cancelUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.CancelUpgrade
 */
export declare const cancelUpgrade: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCancelUpgrade | MsgCancelUpgrade[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map