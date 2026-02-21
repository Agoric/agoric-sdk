import { MsgLiquidStake, MsgLSMLiquidStake, MsgRedeemStake, MsgRegisterHostZone, MsgClaimUndelegatedTokens, MsgRebalanceValidators, MsgAddValidators, MsgChangeValidatorWeights, MsgDeleteValidator, MsgRestoreInterchainAccount, MsgCloseDelegationChannel, MsgUpdateValidatorSharesExchRate, MsgCalibrateDelegation, MsgClearBalance, MsgUpdateInnerRedemptionRateBounds, MsgResumeHostZone, MsgCreateTradeRoute, MsgDeleteTradeRoute, MsgUpdateTradeRoute, MsgSetCommunityPoolRebate, MsgToggleTradeController, MsgUpdateHostZoneParams } from '@agoric/cosmic-proto/codegen/stride/stakeibc/tx.js';
/**
 * @name liquidStake
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.LiquidStake
 */
export declare const liquidStake: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgLiquidStake | MsgLiquidStake[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name lSMLiquidStake
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.LSMLiquidStake
 */
export declare const lSMLiquidStake: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgLSMLiquidStake | MsgLSMLiquidStake[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name redeemStake
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RedeemStake
 */
export declare const redeemStake: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRedeemStake | MsgRedeemStake[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name registerHostZone
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RegisterHostZone
 */
export declare const registerHostZone: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRegisterHostZone | MsgRegisterHostZone[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name claimUndelegatedTokens
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ClaimUndelegatedTokens
 */
export declare const claimUndelegatedTokens: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgClaimUndelegatedTokens | MsgClaimUndelegatedTokens[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name rebalanceValidators
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RebalanceValidators
 */
export declare const rebalanceValidators: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRebalanceValidators | MsgRebalanceValidators[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name addValidators
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.AddValidators
 */
export declare const addValidators: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgAddValidators | MsgAddValidators[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name changeValidatorWeight
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ChangeValidatorWeight
 */
export declare const changeValidatorWeight: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChangeValidatorWeights | MsgChangeValidatorWeights[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name deleteValidator
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.DeleteValidator
 */
export declare const deleteValidator: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDeleteValidator | MsgDeleteValidator[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name restoreInterchainAccount
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.RestoreInterchainAccount
 */
export declare const restoreInterchainAccount: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRestoreInterchainAccount | MsgRestoreInterchainAccount[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name closeDelegationChannel
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.CloseDelegationChannel
 */
export declare const closeDelegationChannel: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCloseDelegationChannel | MsgCloseDelegationChannel[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name updateValidatorSharesExchRate
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateValidatorSharesExchRate
 */
export declare const updateValidatorSharesExchRate: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateValidatorSharesExchRate | MsgUpdateValidatorSharesExchRate[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name calibrateDelegation
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.CalibrateDelegation
 */
export declare const calibrateDelegation: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCalibrateDelegation | MsgCalibrateDelegation[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name clearBalance
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ClearBalance
 */
export declare const clearBalance: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgClearBalance | MsgClearBalance[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name updateInnerRedemptionRateBounds
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateInnerRedemptionRateBounds
 */
export declare const updateInnerRedemptionRateBounds: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateInnerRedemptionRateBounds | MsgUpdateInnerRedemptionRateBounds[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name resumeHostZone
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ResumeHostZone
 */
export declare const resumeHostZone: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgResumeHostZone | MsgResumeHostZone[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name createTradeRoute
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.CreateTradeRoute
 */
export declare const createTradeRoute: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateTradeRoute | MsgCreateTradeRoute[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name deleteTradeRoute
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.DeleteTradeRoute
 */
export declare const deleteTradeRoute: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDeleteTradeRoute | MsgDeleteTradeRoute[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name updateTradeRoute
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateTradeRoute
 */
export declare const updateTradeRoute: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateTradeRoute | MsgUpdateTradeRoute[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name setCommunityPoolRebate
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.SetCommunityPoolRebate
 */
export declare const setCommunityPoolRebate: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSetCommunityPoolRebate | MsgSetCommunityPoolRebate[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name toggleTradeController
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ToggleTradeController
 */
export declare const toggleTradeController: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgToggleTradeController | MsgToggleTradeController[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name updateHostZoneParams
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.UpdateHostZoneParams
 */
export declare const updateHostZoneParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateHostZoneParams | MsgUpdateHostZoneParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map