//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgCreateVestingAccount, MsgCreatePermanentLockedAccount, MsgCreatePeriodicVestingAccount, MsgCreateClawbackVestingAccount, MsgClawback, MsgReturnGrants, } from '@agoric/cosmic-proto/codegen/cosmos/vesting/v1beta1/tx.js';
/**
 * CreateVestingAccount defines a method that enables creating a vesting
 * account.
 * @name createVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreateVestingAccount
 */
export const createVestingAccount = buildTx({
    msg: MsgCreateVestingAccount,
});
/**
 * CreatePermanentLockedAccount defines a method that enables creating a permanent
 * locked account.
 *
 * Since: cosmos-sdk 0.46
 * @name createPermanentLockedAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreatePermanentLockedAccount
 */
export const createPermanentLockedAccount = buildTx({
    msg: MsgCreatePermanentLockedAccount,
});
/**
 * CreatePeriodicVestingAccount defines a method that enables creating a
 * periodic vesting account.
 *
 * Since: cosmos-sdk 0.46
 * @name createPeriodicVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreatePeriodicVestingAccount
 */
export const createPeriodicVestingAccount = buildTx({
    msg: MsgCreatePeriodicVestingAccount,
});
/**
 * CreateClawbackVestingAccount defines a method that enables creating a
 * vesting account that is subject to clawback.
 * @name createClawbackVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.CreateClawbackVestingAccount
 */
export const createClawbackVestingAccount = buildTx({
    msg: MsgCreateClawbackVestingAccount,
});
/**
 * Clawback removes the unvested tokens from a ClawbackVestingAccount.
 * @name clawback
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.Clawback
 */
export const clawback = buildTx({
    msg: MsgClawback,
});
/**
 * ReturnGrants returns vesting grants to the funder.
 * @name returnGrants
 * @package cosmos.vesting.v1beta1
 * @see proto service: cosmos.vesting.v1beta1.ReturnGrants
 */
export const returnGrants = buildTx({
    msg: MsgReturnGrants,
});
//# sourceMappingURL=tx.rpc.func.js.map