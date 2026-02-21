import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgLiquidStake, MsgLiquidStakeResponse, MsgRedeemStake, MsgRedeemStakeResponse, MsgConfirmDelegation, MsgConfirmDelegationResponse, MsgConfirmUndelegation, MsgConfirmUndelegationResponse, MsgConfirmUnbondedTokenSweep, MsgConfirmUnbondedTokenSweepResponse, MsgAdjustDelegatedBalance, MsgAdjustDelegatedBalanceResponse, MsgUpdateInnerRedemptionRateBounds, MsgUpdateInnerRedemptionRateBoundsResponse, MsgResumeHostZone, MsgResumeHostZoneResponse, MsgRefreshRedemptionRate, MsgRefreshRedemptionRateResponse, MsgOverwriteDelegationRecord, MsgOverwriteDelegationRecordResponse, MsgOverwriteUnbondingRecord, MsgOverwriteUnbondingRecordResponse, MsgOverwriteRedemptionRecord, MsgOverwriteRedemptionRecordResponse, MsgSetOperatorAddress, MsgSetOperatorAddressResponse, } from '@agoric/cosmic-proto/codegen/stride/stakedym/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.liquidStake = this.liquidStake.bind(this);
        this.redeemStake = this.redeemStake.bind(this);
        this.confirmDelegation = this.confirmDelegation.bind(this);
        this.confirmUndelegation = this.confirmUndelegation.bind(this);
        this.confirmUnbondedTokenSweep = this.confirmUnbondedTokenSweep.bind(this);
        this.adjustDelegatedBalance = this.adjustDelegatedBalance.bind(this);
        this.updateInnerRedemptionRateBounds =
            this.updateInnerRedemptionRateBounds.bind(this);
        this.resumeHostZone = this.resumeHostZone.bind(this);
        this.refreshRedemptionRate = this.refreshRedemptionRate.bind(this);
        this.overwriteDelegationRecord = this.overwriteDelegationRecord.bind(this);
        this.overwriteUnbondingRecord = this.overwriteUnbondingRecord.bind(this);
        this.overwriteRedemptionRecord = this.overwriteRedemptionRecord.bind(this);
        this.setOperatorAddress = this.setOperatorAddress.bind(this);
    }
    liquidStake(request) {
        const data = MsgLiquidStake.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'LiquidStake', data);
        return promise.then(data => MsgLiquidStakeResponse.decode(new BinaryReader(data)));
    }
    redeemStake(request) {
        const data = MsgRedeemStake.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'RedeemStake', data);
        return promise.then(data => MsgRedeemStakeResponse.decode(new BinaryReader(data)));
    }
    confirmDelegation(request) {
        const data = MsgConfirmDelegation.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'ConfirmDelegation', data);
        return promise.then(data => MsgConfirmDelegationResponse.decode(new BinaryReader(data)));
    }
    confirmUndelegation(request) {
        const data = MsgConfirmUndelegation.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'ConfirmUndelegation', data);
        return promise.then(data => MsgConfirmUndelegationResponse.decode(new BinaryReader(data)));
    }
    confirmUnbondedTokenSweep(request) {
        const data = MsgConfirmUnbondedTokenSweep.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'ConfirmUnbondedTokenSweep', data);
        return promise.then(data => MsgConfirmUnbondedTokenSweepResponse.decode(new BinaryReader(data)));
    }
    adjustDelegatedBalance(request) {
        const data = MsgAdjustDelegatedBalance.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'AdjustDelegatedBalance', data);
        return promise.then(data => MsgAdjustDelegatedBalanceResponse.decode(new BinaryReader(data)));
    }
    updateInnerRedemptionRateBounds(request) {
        const data = MsgUpdateInnerRedemptionRateBounds.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'UpdateInnerRedemptionRateBounds', data);
        return promise.then(data => MsgUpdateInnerRedemptionRateBoundsResponse.decode(new BinaryReader(data)));
    }
    resumeHostZone(request) {
        const data = MsgResumeHostZone.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'ResumeHostZone', data);
        return promise.then(data => MsgResumeHostZoneResponse.decode(new BinaryReader(data)));
    }
    refreshRedemptionRate(request) {
        const data = MsgRefreshRedemptionRate.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'RefreshRedemptionRate', data);
        return promise.then(data => MsgRefreshRedemptionRateResponse.decode(new BinaryReader(data)));
    }
    overwriteDelegationRecord(request) {
        const data = MsgOverwriteDelegationRecord.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'OverwriteDelegationRecord', data);
        return promise.then(data => MsgOverwriteDelegationRecordResponse.decode(new BinaryReader(data)));
    }
    overwriteUnbondingRecord(request) {
        const data = MsgOverwriteUnbondingRecord.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'OverwriteUnbondingRecord', data);
        return promise.then(data => MsgOverwriteUnbondingRecordResponse.decode(new BinaryReader(data)));
    }
    overwriteRedemptionRecord(request) {
        const data = MsgOverwriteRedemptionRecord.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'OverwriteRedemptionRecord', data);
        return promise.then(data => MsgOverwriteRedemptionRecordResponse.decode(new BinaryReader(data)));
    }
    setOperatorAddress(request) {
        const data = MsgSetOperatorAddress.encode(request).finish();
        const promise = this.rpc.request('stride.stakedym.Msg', 'SetOperatorAddress', data);
        return promise.then(data => MsgSetOperatorAddressResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map