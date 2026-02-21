//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgSubmitProposal, MsgVote, MsgVoteWeighted, MsgDeposit, } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1beta1/tx.js';
/**
 * SubmitProposal defines a method to create new proposal given a content.
 * @name submitProposal
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.SubmitProposal
 */
export const submitProposal = buildTx({
    msg: MsgSubmitProposal,
});
/**
 * Vote defines a method to add a vote on a specific proposal.
 * @name vote
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Vote
 */
export const vote = buildTx({
    msg: MsgVote,
});
/**
 * VoteWeighted defines a method to add a weighted vote on a specific proposal.
 *
 * Since: cosmos-sdk 0.43
 * @name voteWeighted
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.VoteWeighted
 */
export const voteWeighted = buildTx({
    msg: MsgVoteWeighted,
});
/**
 * Deposit defines a method to add deposit on a specific proposal.
 * @name deposit
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Deposit
 */
export const deposit = buildTx({
    msg: MsgDeposit,
});
//# sourceMappingURL=tx.rpc.func.js.map