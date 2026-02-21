import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgLiquidStake, MsgLiquidStakeResponse, MsgLSMLiquidStake, MsgLSMLiquidStakeResponse, MsgRedeemStake, MsgRedeemStakeResponse, MsgRegisterHostZone, MsgRegisterHostZoneResponse, MsgClaimUndelegatedTokens, MsgClaimUndelegatedTokensResponse, MsgRebalanceValidators, MsgRebalanceValidatorsResponse, MsgAddValidators, MsgAddValidatorsResponse, MsgChangeValidatorWeights, MsgChangeValidatorWeightsResponse, MsgDeleteValidator, MsgDeleteValidatorResponse, MsgRestoreInterchainAccount, MsgRestoreInterchainAccountResponse, MsgCloseDelegationChannel, MsgCloseDelegationChannelResponse, MsgUpdateValidatorSharesExchRate, MsgUpdateValidatorSharesExchRateResponse, MsgCalibrateDelegation, MsgCalibrateDelegationResponse, MsgClearBalance, MsgClearBalanceResponse, MsgUpdateInnerRedemptionRateBounds, MsgUpdateInnerRedemptionRateBoundsResponse, MsgResumeHostZone, MsgResumeHostZoneResponse, MsgCreateTradeRoute, MsgCreateTradeRouteResponse, MsgDeleteTradeRoute, MsgDeleteTradeRouteResponse, MsgUpdateTradeRoute, MsgUpdateTradeRouteResponse, MsgSetCommunityPoolRebate, MsgSetCommunityPoolRebateResponse, MsgToggleTradeController, MsgToggleTradeControllerResponse, MsgUpdateHostZoneParams, MsgUpdateHostZoneParamsResponse, } from '@agoric/cosmic-proto/codegen/stride/stakeibc/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.liquidStake = this.liquidStake.bind(this);
        this.lSMLiquidStake = this.lSMLiquidStake.bind(this);
        this.redeemStake = this.redeemStake.bind(this);
        this.registerHostZone = this.registerHostZone.bind(this);
        this.claimUndelegatedTokens = this.claimUndelegatedTokens.bind(this);
        this.rebalanceValidators = this.rebalanceValidators.bind(this);
        this.addValidators = this.addValidators.bind(this);
        this.changeValidatorWeight = this.changeValidatorWeight.bind(this);
        this.deleteValidator = this.deleteValidator.bind(this);
        this.restoreInterchainAccount = this.restoreInterchainAccount.bind(this);
        this.closeDelegationChannel = this.closeDelegationChannel.bind(this);
        this.updateValidatorSharesExchRate =
            this.updateValidatorSharesExchRate.bind(this);
        this.calibrateDelegation = this.calibrateDelegation.bind(this);
        this.clearBalance = this.clearBalance.bind(this);
        this.updateInnerRedemptionRateBounds =
            this.updateInnerRedemptionRateBounds.bind(this);
        this.resumeHostZone = this.resumeHostZone.bind(this);
        this.createTradeRoute = this.createTradeRoute.bind(this);
        this.deleteTradeRoute = this.deleteTradeRoute.bind(this);
        this.updateTradeRoute = this.updateTradeRoute.bind(this);
        this.setCommunityPoolRebate = this.setCommunityPoolRebate.bind(this);
        this.toggleTradeController = this.toggleTradeController.bind(this);
        this.updateHostZoneParams = this.updateHostZoneParams.bind(this);
    }
    liquidStake(request) {
        const data = MsgLiquidStake.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'LiquidStake', data);
        return promise.then(data => MsgLiquidStakeResponse.decode(new BinaryReader(data)));
    }
    lSMLiquidStake(request) {
        const data = MsgLSMLiquidStake.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'LSMLiquidStake', data);
        return promise.then(data => MsgLSMLiquidStakeResponse.decode(new BinaryReader(data)));
    }
    redeemStake(request) {
        const data = MsgRedeemStake.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'RedeemStake', data);
        return promise.then(data => MsgRedeemStakeResponse.decode(new BinaryReader(data)));
    }
    registerHostZone(request) {
        const data = MsgRegisterHostZone.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'RegisterHostZone', data);
        return promise.then(data => MsgRegisterHostZoneResponse.decode(new BinaryReader(data)));
    }
    claimUndelegatedTokens(request) {
        const data = MsgClaimUndelegatedTokens.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'ClaimUndelegatedTokens', data);
        return promise.then(data => MsgClaimUndelegatedTokensResponse.decode(new BinaryReader(data)));
    }
    rebalanceValidators(request) {
        const data = MsgRebalanceValidators.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'RebalanceValidators', data);
        return promise.then(data => MsgRebalanceValidatorsResponse.decode(new BinaryReader(data)));
    }
    addValidators(request) {
        const data = MsgAddValidators.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'AddValidators', data);
        return promise.then(data => MsgAddValidatorsResponse.decode(new BinaryReader(data)));
    }
    changeValidatorWeight(request) {
        const data = MsgChangeValidatorWeights.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'ChangeValidatorWeight', data);
        return promise.then(data => MsgChangeValidatorWeightsResponse.decode(new BinaryReader(data)));
    }
    deleteValidator(request) {
        const data = MsgDeleteValidator.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'DeleteValidator', data);
        return promise.then(data => MsgDeleteValidatorResponse.decode(new BinaryReader(data)));
    }
    restoreInterchainAccount(request) {
        const data = MsgRestoreInterchainAccount.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'RestoreInterchainAccount', data);
        return promise.then(data => MsgRestoreInterchainAccountResponse.decode(new BinaryReader(data)));
    }
    closeDelegationChannel(request) {
        const data = MsgCloseDelegationChannel.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'CloseDelegationChannel', data);
        return promise.then(data => MsgCloseDelegationChannelResponse.decode(new BinaryReader(data)));
    }
    updateValidatorSharesExchRate(request) {
        const data = MsgUpdateValidatorSharesExchRate.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'UpdateValidatorSharesExchRate', data);
        return promise.then(data => MsgUpdateValidatorSharesExchRateResponse.decode(new BinaryReader(data)));
    }
    calibrateDelegation(request) {
        const data = MsgCalibrateDelegation.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'CalibrateDelegation', data);
        return promise.then(data => MsgCalibrateDelegationResponse.decode(new BinaryReader(data)));
    }
    clearBalance(request) {
        const data = MsgClearBalance.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'ClearBalance', data);
        return promise.then(data => MsgClearBalanceResponse.decode(new BinaryReader(data)));
    }
    updateInnerRedemptionRateBounds(request) {
        const data = MsgUpdateInnerRedemptionRateBounds.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'UpdateInnerRedemptionRateBounds', data);
        return promise.then(data => MsgUpdateInnerRedemptionRateBoundsResponse.decode(new BinaryReader(data)));
    }
    resumeHostZone(request) {
        const data = MsgResumeHostZone.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'ResumeHostZone', data);
        return promise.then(data => MsgResumeHostZoneResponse.decode(new BinaryReader(data)));
    }
    createTradeRoute(request) {
        const data = MsgCreateTradeRoute.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'CreateTradeRoute', data);
        return promise.then(data => MsgCreateTradeRouteResponse.decode(new BinaryReader(data)));
    }
    deleteTradeRoute(request) {
        const data = MsgDeleteTradeRoute.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'DeleteTradeRoute', data);
        return promise.then(data => MsgDeleteTradeRouteResponse.decode(new BinaryReader(data)));
    }
    updateTradeRoute(request) {
        const data = MsgUpdateTradeRoute.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'UpdateTradeRoute', data);
        return promise.then(data => MsgUpdateTradeRouteResponse.decode(new BinaryReader(data)));
    }
    setCommunityPoolRebate(request) {
        const data = MsgSetCommunityPoolRebate.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'SetCommunityPoolRebate', data);
        return promise.then(data => MsgSetCommunityPoolRebateResponse.decode(new BinaryReader(data)));
    }
    toggleTradeController(request) {
        const data = MsgToggleTradeController.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'ToggleTradeController', data);
        return promise.then(data => MsgToggleTradeControllerResponse.decode(new BinaryReader(data)));
    }
    updateHostZoneParams(request) {
        const data = MsgUpdateHostZoneParams.encode(request).finish();
        const promise = this.rpc.request('stride.stakeibc.Msg', 'UpdateHostZoneParams', data);
        return promise.then(data => MsgUpdateHostZoneParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map