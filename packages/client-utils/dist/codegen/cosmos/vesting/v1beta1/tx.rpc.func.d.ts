import { MsgCreateVestingAccount, MsgCreatePermanentLockedAccount, MsgCreatePeriodicVestingAccount, MsgCreateClawbackVestingAccount, MsgClawback, MsgReturnGrants } from '@agoric/cosmic-proto/codegen/cosmos/vesting/v1beta1/tx.js';
/**
 * CreateVestingAccount defines a method that enables creating a vesting
 * account.
 * @name createVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreateVestingAccount
 */
export declare const createVestingAccount: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateVestingAccount | MsgCreateVestingAccount[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CreatePermanentLockedAccount defines a method that enables creating a permanent
 * locked account.
 *
 * Since: cosmos-sdk 0.46
 * @name createPermanentLockedAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreatePermanentLockedAccount
 */
export declare const createPermanentLockedAccount: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreatePermanentLockedAccount | MsgCreatePermanentLockedAccount[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CreatePeriodicVestingAccount defines a method that enables creating a
 * periodic vesting account.
 *
 * Since: cosmos-sdk 0.46
 * @name createPeriodicVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreatePeriodicVestingAccount
 */
export declare const createPeriodicVestingAccount: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreatePeriodicVestingAccount | MsgCreatePeriodicVestingAccount[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CreateClawbackVestingAccount defines a method that enables creating a
 * vesting account that is subject to clawback.
 * @name createClawbackVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreateClawbackVestingAccount
 */
export declare const createClawbackVestingAccount: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateClawbackVestingAccount | MsgCreateClawbackVestingAccount[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Clawback removes the unvested tokens from a ClawbackVestingAccount.
 * @name clawback
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.Clawback
 */
export declare const clawback: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgClawback | MsgClawback[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ReturnGrants returns vesting grants to the funder.
 * @name returnGrants
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.ReturnGrants
 */
export declare const returnGrants: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgReturnGrants | MsgReturnGrants[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map