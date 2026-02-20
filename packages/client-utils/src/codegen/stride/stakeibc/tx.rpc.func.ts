//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  MsgLiquidStake,
  MsgLSMLiquidStake,
  MsgRedeemStake,
  MsgRegisterHostZone,
  MsgClaimUndelegatedTokens,
  MsgRebalanceValidators,
  MsgAddValidators,
  MsgChangeValidatorWeights,
  MsgDeleteValidator,
  MsgRestoreInterchainAccount,
  MsgCloseDelegationChannel,
  MsgUpdateValidatorSharesExchRate,
  MsgCalibrateDelegation,
  MsgClearBalance,
  MsgUpdateInnerRedemptionRateBounds,
  MsgResumeHostZone,
  MsgCreateTradeRoute,
  MsgDeleteTradeRoute,
  MsgUpdateTradeRoute,
  MsgSetCommunityPoolRebate,
  MsgToggleTradeController,
  MsgUpdateHostZoneParams,
} from '@agoric/cosmic-proto/codegen/stride/stakeibc/tx.js';
/**
 * @name liquidStake
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.LiquidStake
 */
export const liquidStake = buildTx<MsgLiquidStake>({
  msg: MsgLiquidStake,
});
/**
 * @name lSMLiquidStake
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.LSMLiquidStake
 */
export const lSMLiquidStake = buildTx<MsgLSMLiquidStake>({
  msg: MsgLSMLiquidStake,
});
/**
 * @name redeemStake
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RedeemStake
 */
export const redeemStake = buildTx<MsgRedeemStake>({
  msg: MsgRedeemStake,
});
/**
 * @name registerHostZone
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RegisterHostZone
 */
export const registerHostZone = buildTx<MsgRegisterHostZone>({
  msg: MsgRegisterHostZone,
});
/**
 * @name claimUndelegatedTokens
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ClaimUndelegatedTokens
 */
export const claimUndelegatedTokens = buildTx<MsgClaimUndelegatedTokens>({
  msg: MsgClaimUndelegatedTokens,
});
/**
 * @name rebalanceValidators
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RebalanceValidators
 */
export const rebalanceValidators = buildTx<MsgRebalanceValidators>({
  msg: MsgRebalanceValidators,
});
/**
 * @name addValidators
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.AddValidators
 */
export const addValidators = buildTx<MsgAddValidators>({
  msg: MsgAddValidators,
});
/**
 * @name changeValidatorWeight
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ChangeValidatorWeight
 */
export const changeValidatorWeight = buildTx<MsgChangeValidatorWeights>({
  msg: MsgChangeValidatorWeights,
});
/**
 * @name deleteValidator
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.DeleteValidator
 */
export const deleteValidator = buildTx<MsgDeleteValidator>({
  msg: MsgDeleteValidator,
});
/**
 * @name restoreInterchainAccount
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RestoreInterchainAccount
 */
export const restoreInterchainAccount = buildTx<MsgRestoreInterchainAccount>({
  msg: MsgRestoreInterchainAccount,
});
/**
 * @name closeDelegationChannel
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.CloseDelegationChannel
 */
export const closeDelegationChannel = buildTx<MsgCloseDelegationChannel>({
  msg: MsgCloseDelegationChannel,
});
/**
 * @name updateValidatorSharesExchRate
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateValidatorSharesExchRate
 */
export const updateValidatorSharesExchRate =
  buildTx<MsgUpdateValidatorSharesExchRate>({
    msg: MsgUpdateValidatorSharesExchRate,
  });
/**
 * @name calibrateDelegation
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.CalibrateDelegation
 */
export const calibrateDelegation = buildTx<MsgCalibrateDelegation>({
  msg: MsgCalibrateDelegation,
});
/**
 * @name clearBalance
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ClearBalance
 */
export const clearBalance = buildTx<MsgClearBalance>({
  msg: MsgClearBalance,
});
/**
 * @name updateInnerRedemptionRateBounds
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateInnerRedemptionRateBounds
 */
export const updateInnerRedemptionRateBounds =
  buildTx<MsgUpdateInnerRedemptionRateBounds>({
    msg: MsgUpdateInnerRedemptionRateBounds,
  });
/**
 * @name resumeHostZone
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ResumeHostZone
 */
export const resumeHostZone = buildTx<MsgResumeHostZone>({
  msg: MsgResumeHostZone,
});
/**
 * @name createTradeRoute
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.CreateTradeRoute
 */
export const createTradeRoute = buildTx<MsgCreateTradeRoute>({
  msg: MsgCreateTradeRoute,
});
/**
 * @name deleteTradeRoute
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.DeleteTradeRoute
 */
export const deleteTradeRoute = buildTx<MsgDeleteTradeRoute>({
  msg: MsgDeleteTradeRoute,
});
/**
 * @name updateTradeRoute
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateTradeRoute
 */
export const updateTradeRoute = buildTx<MsgUpdateTradeRoute>({
  msg: MsgUpdateTradeRoute,
});
/**
 * @name setCommunityPoolRebate
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.SetCommunityPoolRebate
 */
export const setCommunityPoolRebate = buildTx<MsgSetCommunityPoolRebate>({
  msg: MsgSetCommunityPoolRebate,
});
/**
 * @name toggleTradeController
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ToggleTradeController
 */
export const toggleTradeController = buildTx<MsgToggleTradeController>({
  msg: MsgToggleTradeController,
});
/**
 * @name updateHostZoneParams
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateHostZoneParams
 */
export const updateHostZoneParams = buildTx<MsgUpdateHostZoneParams>({
  msg: MsgUpdateHostZoneParams,
});
