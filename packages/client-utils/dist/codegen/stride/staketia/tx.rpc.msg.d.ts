import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgLiquidStake, MsgLiquidStakeResponse, MsgRedeemStake, MsgRedeemStakeResponse, MsgConfirmDelegation, MsgConfirmDelegationResponse, MsgConfirmUndelegation, MsgConfirmUndelegationResponse, MsgConfirmUnbondedTokenSweep, MsgConfirmUnbondedTokenSweepResponse, MsgAdjustDelegatedBalance, MsgAdjustDelegatedBalanceResponse, MsgUpdateInnerRedemptionRateBounds, MsgUpdateInnerRedemptionRateBoundsResponse, MsgResumeHostZone, MsgResumeHostZoneResponse, MsgRefreshRedemptionRate, MsgRefreshRedemptionRateResponse, MsgOverwriteDelegationRecord, MsgOverwriteDelegationRecordResponse, MsgOverwriteUnbondingRecord, MsgOverwriteUnbondingRecordResponse, MsgOverwriteRedemptionRecord, MsgOverwriteRedemptionRecordResponse, MsgSetOperatorAddress, MsgSetOperatorAddressResponse } from '@agoric/cosmic-proto/codegen/stride/staketia/tx.js';
/** Msg defines the Msg service. */
export interface Msg {
    /** User transaction to liquid stake native tokens into stTokens */
    liquidStake(request: MsgLiquidStake): Promise<MsgLiquidStakeResponse>;
    /** User transaction to redeem stake stTokens into native tokens */
    redeemStake(request: MsgRedeemStake): Promise<MsgRedeemStakeResponse>;
    /**
     * Operator transaction to confirm a delegation was submitted
     * on the host chain
     */
    confirmDelegation(request: MsgConfirmDelegation): Promise<MsgConfirmDelegationResponse>;
    /**
     * Operator transaction to confirm an undelegation was submitted
     * on the host chain
     */
    confirmUndelegation(request: MsgConfirmUndelegation): Promise<MsgConfirmUndelegationResponse>;
    /**
     * Operator transaction to confirm unbonded tokens were transferred back to
     * stride
     */
    confirmUnbondedTokenSweep(request: MsgConfirmUnbondedTokenSweep): Promise<MsgConfirmUnbondedTokenSweepResponse>;
    /**
     * Operator transaction to adjust the delegated balance after a validator was
     * slashed
     */
    adjustDelegatedBalance(request: MsgAdjustDelegatedBalance): Promise<MsgAdjustDelegatedBalanceResponse>;
    /** Adjusts the inner redemption rate bounds on the host zone */
    updateInnerRedemptionRateBounds(request: MsgUpdateInnerRedemptionRateBounds): Promise<MsgUpdateInnerRedemptionRateBoundsResponse>;
    /** Unhalts the host zone if redemption rates were exceeded */
    resumeHostZone(request: MsgResumeHostZone): Promise<MsgResumeHostZoneResponse>;
    /** Trigger updating the redemption rate */
    refreshRedemptionRate(request: MsgRefreshRedemptionRate): Promise<MsgRefreshRedemptionRateResponse>;
    /** Overwrites a delegation record */
    overwriteDelegationRecord(request: MsgOverwriteDelegationRecord): Promise<MsgOverwriteDelegationRecordResponse>;
    /** Overwrites a unbonding record */
    overwriteUnbondingRecord(request: MsgOverwriteUnbondingRecord): Promise<MsgOverwriteUnbondingRecordResponse>;
    /** Overwrites a redemption record */
    overwriteRedemptionRecord(request: MsgOverwriteRedemptionRecord): Promise<MsgOverwriteRedemptionRecordResponse>;
    /** Sets the operator address */
    setOperatorAddress(request: MsgSetOperatorAddress): Promise<MsgSetOperatorAddressResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    liquidStake(request: MsgLiquidStake): Promise<MsgLiquidStakeResponse>;
    redeemStake(request: MsgRedeemStake): Promise<MsgRedeemStakeResponse>;
    confirmDelegation(request: MsgConfirmDelegation): Promise<MsgConfirmDelegationResponse>;
    confirmUndelegation(request: MsgConfirmUndelegation): Promise<MsgConfirmUndelegationResponse>;
    confirmUnbondedTokenSweep(request: MsgConfirmUnbondedTokenSweep): Promise<MsgConfirmUnbondedTokenSweepResponse>;
    adjustDelegatedBalance(request: MsgAdjustDelegatedBalance): Promise<MsgAdjustDelegatedBalanceResponse>;
    updateInnerRedemptionRateBounds(request: MsgUpdateInnerRedemptionRateBounds): Promise<MsgUpdateInnerRedemptionRateBoundsResponse>;
    resumeHostZone(request: MsgResumeHostZone): Promise<MsgResumeHostZoneResponse>;
    refreshRedemptionRate(request: MsgRefreshRedemptionRate): Promise<MsgRefreshRedemptionRateResponse>;
    overwriteDelegationRecord(request: MsgOverwriteDelegationRecord): Promise<MsgOverwriteDelegationRecordResponse>;
    overwriteUnbondingRecord(request: MsgOverwriteUnbondingRecord): Promise<MsgOverwriteUnbondingRecordResponse>;
    overwriteRedemptionRecord(request: MsgOverwriteRedemptionRecord): Promise<MsgOverwriteRedemptionRecordResponse>;
    setOperatorAddress(request: MsgSetOperatorAddress): Promise<MsgSetOperatorAddressResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map