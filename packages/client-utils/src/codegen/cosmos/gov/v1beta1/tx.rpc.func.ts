//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import {
  MsgSubmitProposal,
  MsgVote,
  MsgVoteWeighted,
  MsgDeposit,
} from './tx.js';
/**
 * SubmitProposal defines a method to create new proposal given a content.
 * @name submitProposal
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.SubmitProposal
 */
export const submitProposal = buildTx<MsgSubmitProposal>({
  msg: MsgSubmitProposal,
});
/**
 * Vote defines a method to add a vote on a specific proposal.
 * @name vote
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Vote
 */
export const vote = buildTx<MsgVote>({
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
export const voteWeighted = buildTx<MsgVoteWeighted>({
  msg: MsgVoteWeighted,
});
/**
 * Deposit defines a method to add deposit on a specific proposal.
 * @name deposit
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Deposit
 */
export const deposit = buildTx<MsgDeposit>({
  msg: MsgDeposit,
});
