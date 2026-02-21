import { MsgSubmitProposal, MsgVote, MsgVoteWeighted, MsgDeposit } from './tx.js';
/**
 * SubmitProposal defines a method to create new proposal given a content.
 * @name submitProposal
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.SubmitProposal
 */
export declare const submitProposal: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSubmitProposal | MsgSubmitProposal[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Vote defines a method to add a vote on a specific proposal.
 * @name vote
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Vote
 */
export declare const vote: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgVote | MsgVote[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * VoteWeighted defines a method to add a weighted vote on a specific proposal.
 *
 * Since: cosmos-sdk 0.43
 * @name voteWeighted
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.VoteWeighted
 */
export declare const voteWeighted: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgVoteWeighted | MsgVoteWeighted[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Deposit defines a method to add deposit on a specific proposal.
 * @name deposit
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Deposit
 */
export declare const deposit: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDeposit | MsgDeposit[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map