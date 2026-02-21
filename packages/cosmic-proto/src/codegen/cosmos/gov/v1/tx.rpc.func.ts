//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import {
  MsgSubmitProposal,
  MsgExecLegacyContent,
  MsgVote,
  MsgVoteWeighted,
  MsgDeposit,
  MsgUpdateParams,
  MsgCancelProposal,
} from './tx.js';
/**
 * SubmitProposal defines a method to create new proposal given the messages.
 * @name submitProposal
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.SubmitProposal
 */
export const submitProposal = buildTx<MsgSubmitProposal>({
  msg: MsgSubmitProposal,
});
/**
 * ExecLegacyContent defines a Msg to be in included in a MsgSubmitProposal
 * to execute a legacy content-based proposal.
 * @name execLegacyContent
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.ExecLegacyContent
 */
export const execLegacyContent = buildTx<MsgExecLegacyContent>({
  msg: MsgExecLegacyContent,
});
/**
 * Vote defines a method to add a vote on a specific proposal.
 * @name vote
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Vote
 */
export const vote = buildTx<MsgVote>({
  msg: MsgVote,
});
/**
 * VoteWeighted defines a method to add a weighted vote on a specific proposal.
 * @name voteWeighted
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.VoteWeighted
 */
export const voteWeighted = buildTx<MsgVoteWeighted>({
  msg: MsgVoteWeighted,
});
/**
 * Deposit defines a method to add deposit on a specific proposal.
 * @name deposit
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Deposit
 */
export const deposit = buildTx<MsgDeposit>({
  msg: MsgDeposit,
});
/**
 * UpdateParams defines a governance operation for updating the x/gov module
 * parameters. The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
/**
 * CancelProposal defines a method to cancel governance proposal
 *
 * Since: cosmos-sdk 0.50
 * @name cancelProposal
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.CancelProposal
 */
export const cancelProposal = buildTx<MsgCancelProposal>({
  msg: MsgCancelProposal,
});
