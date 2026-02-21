import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgLiquidStake, MsgLiquidStakeResponse, MsgLSMLiquidStake, MsgLSMLiquidStakeResponse, MsgRedeemStake, MsgRedeemStakeResponse, MsgRegisterHostZone, MsgRegisterHostZoneResponse, MsgClaimUndelegatedTokens, MsgClaimUndelegatedTokensResponse, MsgRebalanceValidators, MsgRebalanceValidatorsResponse, MsgAddValidators, MsgAddValidatorsResponse, MsgChangeValidatorWeights, MsgChangeValidatorWeightsResponse, MsgDeleteValidator, MsgDeleteValidatorResponse, MsgRestoreInterchainAccount, MsgRestoreInterchainAccountResponse, MsgCloseDelegationChannel, MsgCloseDelegationChannelResponse, MsgUpdateValidatorSharesExchRate, MsgUpdateValidatorSharesExchRateResponse, MsgCalibrateDelegation, MsgCalibrateDelegationResponse, MsgClearBalance, MsgClearBalanceResponse, MsgUpdateInnerRedemptionRateBounds, MsgUpdateInnerRedemptionRateBoundsResponse, MsgResumeHostZone, MsgResumeHostZoneResponse, MsgCreateTradeRoute, MsgCreateTradeRouteResponse, MsgDeleteTradeRoute, MsgDeleteTradeRouteResponse, MsgUpdateTradeRoute, MsgUpdateTradeRouteResponse, MsgSetCommunityPoolRebate, MsgSetCommunityPoolRebateResponse, MsgToggleTradeController, MsgToggleTradeControllerResponse, MsgUpdateHostZoneParams, MsgUpdateHostZoneParamsResponse } from '@agoric/cosmic-proto/codegen/stride/stakeibc/tx.js';
/** Msg defines the Msg service. */
export interface Msg {
    liquidStake(request: MsgLiquidStake): Promise<MsgLiquidStakeResponse>;
    lSMLiquidStake(request: MsgLSMLiquidStake): Promise<MsgLSMLiquidStakeResponse>;
    redeemStake(request: MsgRedeemStake): Promise<MsgRedeemStakeResponse>;
    registerHostZone(request: MsgRegisterHostZone): Promise<MsgRegisterHostZoneResponse>;
    claimUndelegatedTokens(request: MsgClaimUndelegatedTokens): Promise<MsgClaimUndelegatedTokensResponse>;
    rebalanceValidators(request: MsgRebalanceValidators): Promise<MsgRebalanceValidatorsResponse>;
    addValidators(request: MsgAddValidators): Promise<MsgAddValidatorsResponse>;
    changeValidatorWeight(request: MsgChangeValidatorWeights): Promise<MsgChangeValidatorWeightsResponse>;
    deleteValidator(request: MsgDeleteValidator): Promise<MsgDeleteValidatorResponse>;
    restoreInterchainAccount(request: MsgRestoreInterchainAccount): Promise<MsgRestoreInterchainAccountResponse>;
    closeDelegationChannel(request: MsgCloseDelegationChannel): Promise<MsgCloseDelegationChannelResponse>;
    updateValidatorSharesExchRate(request: MsgUpdateValidatorSharesExchRate): Promise<MsgUpdateValidatorSharesExchRateResponse>;
    calibrateDelegation(request: MsgCalibrateDelegation): Promise<MsgCalibrateDelegationResponse>;
    clearBalance(request: MsgClearBalance): Promise<MsgClearBalanceResponse>;
    updateInnerRedemptionRateBounds(request: MsgUpdateInnerRedemptionRateBounds): Promise<MsgUpdateInnerRedemptionRateBoundsResponse>;
    resumeHostZone(request: MsgResumeHostZone): Promise<MsgResumeHostZoneResponse>;
    createTradeRoute(request: MsgCreateTradeRoute): Promise<MsgCreateTradeRouteResponse>;
    deleteTradeRoute(request: MsgDeleteTradeRoute): Promise<MsgDeleteTradeRouteResponse>;
    updateTradeRoute(request: MsgUpdateTradeRoute): Promise<MsgUpdateTradeRouteResponse>;
    setCommunityPoolRebate(request: MsgSetCommunityPoolRebate): Promise<MsgSetCommunityPoolRebateResponse>;
    toggleTradeController(request: MsgToggleTradeController): Promise<MsgToggleTradeControllerResponse>;
    updateHostZoneParams(request: MsgUpdateHostZoneParams): Promise<MsgUpdateHostZoneParamsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    liquidStake(request: MsgLiquidStake): Promise<MsgLiquidStakeResponse>;
    lSMLiquidStake(request: MsgLSMLiquidStake): Promise<MsgLSMLiquidStakeResponse>;
    redeemStake(request: MsgRedeemStake): Promise<MsgRedeemStakeResponse>;
    registerHostZone(request: MsgRegisterHostZone): Promise<MsgRegisterHostZoneResponse>;
    claimUndelegatedTokens(request: MsgClaimUndelegatedTokens): Promise<MsgClaimUndelegatedTokensResponse>;
    rebalanceValidators(request: MsgRebalanceValidators): Promise<MsgRebalanceValidatorsResponse>;
    addValidators(request: MsgAddValidators): Promise<MsgAddValidatorsResponse>;
    changeValidatorWeight(request: MsgChangeValidatorWeights): Promise<MsgChangeValidatorWeightsResponse>;
    deleteValidator(request: MsgDeleteValidator): Promise<MsgDeleteValidatorResponse>;
    restoreInterchainAccount(request: MsgRestoreInterchainAccount): Promise<MsgRestoreInterchainAccountResponse>;
    closeDelegationChannel(request: MsgCloseDelegationChannel): Promise<MsgCloseDelegationChannelResponse>;
    updateValidatorSharesExchRate(request: MsgUpdateValidatorSharesExchRate): Promise<MsgUpdateValidatorSharesExchRateResponse>;
    calibrateDelegation(request: MsgCalibrateDelegation): Promise<MsgCalibrateDelegationResponse>;
    clearBalance(request: MsgClearBalance): Promise<MsgClearBalanceResponse>;
    updateInnerRedemptionRateBounds(request: MsgUpdateInnerRedemptionRateBounds): Promise<MsgUpdateInnerRedemptionRateBoundsResponse>;
    resumeHostZone(request: MsgResumeHostZone): Promise<MsgResumeHostZoneResponse>;
    createTradeRoute(request: MsgCreateTradeRoute): Promise<MsgCreateTradeRouteResponse>;
    deleteTradeRoute(request: MsgDeleteTradeRoute): Promise<MsgDeleteTradeRouteResponse>;
    updateTradeRoute(request: MsgUpdateTradeRoute): Promise<MsgUpdateTradeRouteResponse>;
    setCommunityPoolRebate(request: MsgSetCommunityPoolRebate): Promise<MsgSetCommunityPoolRebateResponse>;
    toggleTradeController(request: MsgToggleTradeController): Promise<MsgToggleTradeControllerResponse>;
    updateHostZoneParams(request: MsgUpdateHostZoneParams): Promise<MsgUpdateHostZoneParamsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map