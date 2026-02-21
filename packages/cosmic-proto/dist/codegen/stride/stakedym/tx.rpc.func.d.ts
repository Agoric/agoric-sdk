import { MsgLiquidStake, MsgRedeemStake, MsgConfirmDelegation, MsgConfirmUndelegation, MsgConfirmUnbondedTokenSweep, MsgAdjustDelegatedBalance, MsgUpdateInnerRedemptionRateBounds, MsgResumeHostZone, MsgRefreshRedemptionRate, MsgOverwriteDelegationRecord, MsgOverwriteUnbondingRecord, MsgOverwriteRedemptionRecord, MsgSetOperatorAddress } from './tx.js';
/**
 * User transaction to liquid stake native tokens into stTokens
 * @name liquidStake
 * @package stride.stakedym
 * @see proto service: stride.stakedym.LiquidStake
 */
export declare const liquidStake: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgLiquidStake | MsgLiquidStake[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * User transaction to redeem stake stTokens into native tokens
 * @name redeemStake
 * @package stride.stakedym
 * @see proto service: stride.stakedym.RedeemStake
 */
export declare const redeemStake: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRedeemStake | MsgRedeemStake[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Operator transaction to confirm a delegation was submitted
 * on the host chain
 * @name confirmDelegation
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ConfirmDelegation
 */
export declare const confirmDelegation: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConfirmDelegation | MsgConfirmDelegation[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Operator transaction to confirm an undelegation was submitted
 * on the host chain
 * @name confirmUndelegation
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ConfirmUndelegation
 */
export declare const confirmUndelegation: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConfirmUndelegation | MsgConfirmUndelegation[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Operator transaction to confirm unbonded tokens were transferred back to
 * stride
 * @name confirmUnbondedTokenSweep
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ConfirmUnbondedTokenSweep
 */
export declare const confirmUnbondedTokenSweep: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConfirmUnbondedTokenSweep | MsgConfirmUnbondedTokenSweep[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Operator transaction to adjust the delegated balance after a validator was
 * slashed
 * @name adjustDelegatedBalance
 * @package stride.stakedym
 * @see proto service: stride.stakedym.AdjustDelegatedBalance
 */
export declare const adjustDelegatedBalance: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgAdjustDelegatedBalance | MsgAdjustDelegatedBalance[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Adjusts the inner redemption rate bounds on the host zone
 * @name updateInnerRedemptionRateBounds
 * @package stride.stakedym
 * @see proto service: stride.stakedym.UpdateInnerRedemptionRateBounds
 */
export declare const updateInnerRedemptionRateBounds: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateInnerRedemptionRateBounds | MsgUpdateInnerRedemptionRateBounds[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Unhalts the host zone if redemption rates were exceeded
 * @name resumeHostZone
 * @package stride.stakedym
 * @see proto service: stride.stakedym.ResumeHostZone
 */
export declare const resumeHostZone: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgResumeHostZone | MsgResumeHostZone[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Trigger updating the redemption rate
 * @name refreshRedemptionRate
 * @package stride.stakedym
 * @see proto service: stride.stakedym.RefreshRedemptionRate
 */
export declare const refreshRedemptionRate: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRefreshRedemptionRate | MsgRefreshRedemptionRate[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Overwrites a delegation record
 * @name overwriteDelegationRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.OverwriteDelegationRecord
 */
export declare const overwriteDelegationRecord: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgOverwriteDelegationRecord | MsgOverwriteDelegationRecord[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Overwrites a unbonding record
 * @name overwriteUnbondingRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.OverwriteUnbondingRecord
 */
export declare const overwriteUnbondingRecord: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgOverwriteUnbondingRecord | MsgOverwriteUnbondingRecord[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Overwrites a redemption record
 * @name overwriteRedemptionRecord
 * @package stride.stakedym
 * @see proto service: stride.stakedym.OverwriteRedemptionRecord
 */
export declare const overwriteRedemptionRecord: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgOverwriteRedemptionRecord | MsgOverwriteRedemptionRecord[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Sets the operator address
 * @name setOperatorAddress
 * @package stride.stakedym
 * @see proto service: stride.stakedym.SetOperatorAddress
 */
export declare const setOperatorAddress: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSetOperatorAddress | MsgSetOperatorAddress[], fee: import("../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map