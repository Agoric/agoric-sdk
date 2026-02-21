import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgSubmitProposal, MsgSubmitProposalResponse, MsgVote, MsgVoteResponse, MsgVoteWeighted, MsgVoteWeightedResponse, MsgDeposit, MsgDepositResponse } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1beta1/tx.js';
/** Msg defines the gov Msg service. */
export interface Msg {
    /** SubmitProposal defines a method to create new proposal given a content. */
    submitProposal(request: MsgSubmitProposal): Promise<MsgSubmitProposalResponse>;
    /** Vote defines a method to add a vote on a specific proposal. */
    vote(request: MsgVote): Promise<MsgVoteResponse>;
    /**
     * VoteWeighted defines a method to add a weighted vote on a specific proposal.
     *
     * Since: cosmos-sdk 0.43
     */
    voteWeighted(request: MsgVoteWeighted): Promise<MsgVoteWeightedResponse>;
    /** Deposit defines a method to add deposit on a specific proposal. */
    deposit(request: MsgDeposit): Promise<MsgDepositResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    submitProposal(request: MsgSubmitProposal): Promise<MsgSubmitProposalResponse>;
    vote(request: MsgVote): Promise<MsgVoteResponse>;
    voteWeighted(request: MsgVoteWeighted): Promise<MsgVoteWeightedResponse>;
    deposit(request: MsgDeposit): Promise<MsgDepositResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map