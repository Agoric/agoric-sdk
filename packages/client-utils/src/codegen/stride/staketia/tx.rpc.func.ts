//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  MsgLiquidStake,
  MsgRedeemStake,
  MsgConfirmDelegation,
  MsgConfirmUndelegation,
  MsgConfirmUnbondedTokenSweep,
  MsgAdjustDelegatedBalance,
  MsgUpdateInnerRedemptionRateBounds,
  MsgResumeHostZone,
  MsgRefreshRedemptionRate,
  MsgOverwriteDelegationRecord,
  MsgOverwriteUnbondingRecord,
  MsgOverwriteRedemptionRecord,
  MsgSetOperatorAddress,
} from '@agoric/cosmic-proto/codegen/stride/staketia/tx.js';
/**
 * User transaction to liquid stake native tokens into stTokens
 * @name liquidStake
 * @package stride.staketia
 * @see proto service: stride.staketia.LiquidStake
 */
export const liquidStake = buildTx<MsgLiquidStake>({
  msg: MsgLiquidStake,
});
/**
 * User transaction to redeem stake stTokens into native tokens
 * @name redeemStake
 * @package stride.staketia
 * @see proto service: stride.staketia.RedeemStake
 */
export const redeemStake = buildTx<MsgRedeemStake>({
  msg: MsgRedeemStake,
});
/**
 * Operator transaction to confirm a delegation was submitted
 * on the host chain
 * @name confirmDelegation
 * @package stride.staketia
 * @see proto service: stride.staketia.ConfirmDelegation
 */
export const confirmDelegation = buildTx<MsgConfirmDelegation>({
  msg: MsgConfirmDelegation,
});
/**
 * Operator transaction to confirm an undelegation was submitted
 * on the host chain
 * @name confirmUndelegation
 * @package stride.staketia
 * @see proto service: stride.staketia.ConfirmUndelegation
 */
export const confirmUndelegation = buildTx<MsgConfirmUndelegation>({
  msg: MsgConfirmUndelegation,
});
/**
 * Operator transaction to confirm unbonded tokens were transferred back to
 * stride
 * @name confirmUnbondedTokenSweep
 * @package stride.staketia
 * @see proto service: stride.staketia.ConfirmUnbondedTokenSweep
 */
export const confirmUnbondedTokenSweep = buildTx<MsgConfirmUnbondedTokenSweep>({
  msg: MsgConfirmUnbondedTokenSweep,
});
/**
 * Operator transaction to adjust the delegated balance after a validator was
 * slashed
 * @name adjustDelegatedBalance
 * @package stride.staketia
 * @see proto service: stride.staketia.AdjustDelegatedBalance
 */
export const adjustDelegatedBalance = buildTx<MsgAdjustDelegatedBalance>({
  msg: MsgAdjustDelegatedBalance,
});
/**
 * Adjusts the inner redemption rate bounds on the host zone
 * @name updateInnerRedemptionRateBounds
 * @package stride.staketia
 * @see proto service: stride.staketia.UpdateInnerRedemptionRateBounds
 */
export const updateInnerRedemptionRateBounds =
  buildTx<MsgUpdateInnerRedemptionRateBounds>({
    msg: MsgUpdateInnerRedemptionRateBounds,
  });
/**
 * Unhalts the host zone if redemption rates were exceeded
 * @name resumeHostZone
 * @package stride.staketia
 * @see proto service: stride.staketia.ResumeHostZone
 */
export const resumeHostZone = buildTx<MsgResumeHostZone>({
  msg: MsgResumeHostZone,
});
/**
 * Trigger updating the redemption rate
 * @name refreshRedemptionRate
 * @package stride.staketia
 * @see proto service: stride.staketia.RefreshRedemptionRate
 */
export const refreshRedemptionRate = buildTx<MsgRefreshRedemptionRate>({
  msg: MsgRefreshRedemptionRate,
});
/**
 * Overwrites a delegation record
 * @name overwriteDelegationRecord
 * @package stride.staketia
 * @see proto service: stride.staketia.OverwriteDelegationRecord
 */
export const overwriteDelegationRecord = buildTx<MsgOverwriteDelegationRecord>({
  msg: MsgOverwriteDelegationRecord,
});
/**
 * Overwrites a unbonding record
 * @name overwriteUnbondingRecord
 * @package stride.staketia
 * @see proto service: stride.staketia.OverwriteUnbondingRecord
 */
export const overwriteUnbondingRecord = buildTx<MsgOverwriteUnbondingRecord>({
  msg: MsgOverwriteUnbondingRecord,
});
/**
 * Overwrites a redemption record
 * @name overwriteRedemptionRecord
 * @package stride.staketia
 * @see proto service: stride.staketia.OverwriteRedemptionRecord
 */
export const overwriteRedemptionRecord = buildTx<MsgOverwriteRedemptionRecord>({
  msg: MsgOverwriteRedemptionRecord,
});
/**
 * Sets the operator address
 * @name setOperatorAddress
 * @package stride.staketia
 * @see proto service: stride.staketia.SetOperatorAddress
 */
export const setOperatorAddress = buildTx<MsgSetOperatorAddress>({
  msg: MsgSetOperatorAddress,
});
