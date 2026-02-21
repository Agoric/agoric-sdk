import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgSubmitProposal, MsgSubmitProposalResponse, MsgExecLegacyContent, MsgExecLegacyContentResponse, MsgVote, MsgVoteResponse, MsgVoteWeighted, MsgVoteWeightedResponse, MsgDeposit, MsgDepositResponse, MsgUpdateParams, MsgUpdateParamsResponse, MsgCancelProposal, MsgCancelProposalResponse } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1/tx.js';
/** Msg defines the gov Msg service. */
export interface Msg {
    /** SubmitProposal defines a method to create new proposal given the messages. */
    submitProposal(request: MsgSubmitProposal): Promise<MsgSubmitProposalResponse>;
    /**
     * ExecLegacyContent defines a Msg to be in included in a MsgSubmitProposal
     * to execute a legacy content-based proposal.
     */
    execLegacyContent(request: MsgExecLegacyContent): Promise<MsgExecLegacyContentResponse>;
    /** Vote defines a method to add a vote on a specific proposal. */
    vote(request: MsgVote): Promise<MsgVoteResponse>;
    /** VoteWeighted defines a method to add a weighted vote on a specific proposal. */
    voteWeighted(request: MsgVoteWeighted): Promise<MsgVoteWeightedResponse>;
    /** Deposit defines a method to add deposit on a specific proposal. */
    deposit(request: MsgDeposit): Promise<MsgDepositResponse>;
    /**
     * UpdateParams defines a governance operation for updating the x/gov module
     * parameters. The authority is defined in the keeper.
     *
     * Since: cosmos-sdk 0.47
     */
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
    /**
     * CancelProposal defines a method to cancel governance proposal
     *
     * Since: cosmos-sdk 0.50
     */
    cancelProposal(request: MsgCancelProposal): Promise<MsgCancelProposalResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    submitProposal(request: MsgSubmitProposal): Promise<MsgSubmitProposalResponse>;
    execLegacyContent(request: MsgExecLegacyContent): Promise<MsgExecLegacyContentResponse>;
    vote(request: MsgVote): Promise<MsgVoteResponse>;
    voteWeighted(request: MsgVoteWeighted): Promise<MsgVoteWeightedResponse>;
    deposit(request: MsgDeposit): Promise<MsgDepositResponse>;
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
    cancelProposal(request: MsgCancelProposal): Promise<MsgCancelProposalResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map