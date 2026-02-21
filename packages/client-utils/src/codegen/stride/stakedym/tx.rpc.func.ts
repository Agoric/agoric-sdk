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
} from '@agoric/cosmic-proto/codegen/stride/stakedym/tx.js';
/**
 * User transaction to liquid stake native tokens into stTokens
 * @name liquidStake
 * @package stride.stakedym
 * @see proto service: stride.stakedym.LiquidStake
 */
export const liquidStake = buildTx<MsgLiquidStake>({
  msg: MsgLiquidStake,
});
/**
 * User transaction to redeem stake stTokens into native tokens
 * @name redeemStake
 * @package stride.stakedym
 * @see proto service: stride.stakedym.RedeemStake
 */
export const redeemStake = buildTx<MsgRedeemStake>({
  msg: MsgRedeemStake,
});
/**
 * Operator transaction to confirm a delegation was submitted
 * on the host chain
 * @name confirmDelegation
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ConfirmDelegation
 */
export const confirmDelegation = buildTx<MsgConfirmDelegation>({
  msg: MsgConfirmDelegation,
});
/**
 * Operator transaction to confirm an undelegation was submitted
 * on the host chain
 * @name confirmUndelegation
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ConfirmUndelegation
 */
export const confirmUndelegation = buildTx<MsgConfirmUndelegation>({
  msg: MsgConfirmUndelegation,
});
/**
 * Operator transaction to confirm unbonded tokens were transferred back to
 * stride
 * @name confirmUnbondedTokenSweep
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ConfirmUnbondedTokenSweep
 */
export const confirmUnbondedTokenSweep = buildTx<MsgConfirmUnbondedTokenSweep>({
  msg: MsgConfirmUnbondedTokenSweep,
});
/**
 * Operator transaction to adjust the delegated balance after a validator was
 * slashed
 * @name adjustDelegatedBalance
 * @package stride.stakedym
 * @see proto service: stride.stakedym.AdjustDelegatedBalance
 */
export const adjustDelegatedBalance = buildTx<MsgAdjustDelegatedBalance>({
  msg: MsgAdjustDelegatedBalance,
});
/**
 * Adjusts the inner redemption rate bounds on the host zone
 * @name updateInnerRedemptionRateBounds
 * @package stride.stakedym
 * @see proto service: stride.stakedym.UpdateInnerRedemptionRateBounds
 */
export const updateInnerRedemptionRateBounds =
  buildTx<MsgUpdateInnerRedemptionRateBounds>({
    msg: MsgUpdateInnerRedemptionRateBounds,
  });
/**
 * Unhalts the host zone if redemption rates were exceeded
 * @name resumeHostZone
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ResumeHostZone
 */
export const resumeHostZone = buildTx<MsgResumeHostZone>({
  msg: MsgResumeHostZone,
});
/**
 * Trigger updating the redemption rate
 * @name refreshRedemptionRate
 * @package stride.stakedym
 * @see proto service: stride.stakedym.RefreshRedemptionRate
 */
export const refreshRedemptionRate = buildTx<MsgRefreshRedemptionRate>({
  msg: MsgRefreshRedemptionRate,
});
/**
 * Overwrites a delegation record
 * @name overwriteDelegationRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.OverwriteDelegationRecord
 */
export const overwriteDelegationRecord = buildTx<MsgOverwriteDelegationRecord>({
  msg: MsgOverwriteDelegationRecord,
});
/**
 * Overwrites a unbonding record
 * @name overwriteUnbondingRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.OverwriteUnbondingRecord
 */
export const overwriteUnbondingRecord = buildTx<MsgOverwriteUnbondingRecord>({
  msg: MsgOverwriteUnbondingRecord,
});
/**
 * Overwrites a redemption record
 * @name overwriteRedemptionRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.OverwriteRedemptionRecord
 */
export const overwriteRedemptionRecord = buildTx<MsgOverwriteRedemptionRecord>({
  msg: MsgOverwriteRedemptionRecord,
});
/**
 * Sets the operator address
 * @name setOperatorAddress
 * @package stride.stakedym
 * @see proto service: stride.stakedym.SetOperatorAddress
 */
export const setOperatorAddress = buildTx<MsgSetOperatorAddress>({
  msg: MsgSetOperatorAddress,
});
