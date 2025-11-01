// Generated from ../type-guards.schemas.js by @agoric/schemas
import type { Pattern } from '@endo/patterns';
import type { z } from 'zod';
import type * as source from '../type-guards.schemas.js';

export type AgoricContractInvitationSpec = z.infer<typeof source.AgoricContractInvitationSpecSchema>;
export declare const AgoricContractInvitationSpec: TypedPattern<AgoricContractInvitationSpec>;

export type ContinuingInvitationSpec = z.infer<typeof source.ContinuingInvitationSpecSchema>;
export declare const ContinuingInvitationSpec: TypedPattern<ContinuingInvitationSpec>;

export type ContractInvitationSpec = z.infer<typeof source.ContractInvitationSpecSchema>;
export declare const ContractInvitationSpec: TypedPattern<ContractInvitationSpec>;

export type InvokeEntryMessage = z.infer<typeof source.InvokeEntryMessageSchema>;
export declare const InvokeEntryMessage: TypedPattern<InvokeEntryMessage>;

export type PurseInvitationSpec = z.infer<typeof source.PurseInvitationSpecSchema>;
export declare const PurseInvitationSpec: TypedPattern<PurseInvitationSpec>;

/**
 * Planner result persistence directive.
 */
export type ResultPlan = z.infer<typeof source.ResultPlanSchema>;
export declare const ResultPlan: TypedPattern<ResultPlan>;

export type StringCapData = z.infer<typeof source.StringCapDataSchema>;
export declare const StringCapData: TypedPattern<StringCapData>;

/**
 * Defined by walletAction struct in msg_server.go
 * 
 * @see {agoric.swingset.MsgWalletAction} and walletSpendAction in msg_server.go
 */
export type WalletActionMsg = z.infer<typeof source.WalletActionMsgSchema>;
export declare const WalletActionMsg: TypedPattern<WalletActionMsg>;

/**
 * Messages transmitted over Cosmos chain, cryptographically verifying that the message came from the 'owner'.
 * 
 * The two wallet actions are distinguished by whether the user had to confirm the sending of the message (as is the case for WALLET_SPEND_ACTION).
 */
export type WalletBridgeMsg = z.infer<typeof source.WalletBridgeMsgSchema>;
export declare const WalletBridgeMsg: TypedPattern<WalletBridgeMsg>;

export type WalletSpendActionMsg = z.infer<typeof source.WalletSpendActionMsgSchema>;
export declare const WalletSpendActionMsg: TypedPattern<WalletSpendActionMsg>;
