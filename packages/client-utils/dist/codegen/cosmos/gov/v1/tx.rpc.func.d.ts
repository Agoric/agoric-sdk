import { MsgSubmitProposal, MsgExecLegacyContent, MsgVote, MsgVoteWeighted, MsgDeposit, MsgUpdateParams, MsgCancelProposal } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1/tx.js';
/**
 * SubmitProposal defines a method to create new proposal given the messages.
 * @name submitProposal
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.SubmitProposal
 */
export declare const submitProposal: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSubmitProposal | MsgSubmitProposal[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ExecLegacyContent defines a Msg to be in included in a MsgSubmitProposal
 * to execute a legacy content-based proposal.
 * @name execLegacyContent
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.ExecLegacyContent
 */
export declare const execLegacyContent: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgExecLegacyContent | MsgExecLegacyContent[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Vote defines a method to add a vote on a specific proposal.
 * @name vote
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Vote
 */
export declare const vote: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgVote | MsgVote[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * VoteWeighted defines a method to add a weighted vote on a specific proposal.
 * @name voteWeighted
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.VoteWeighted
 */
export declare const voteWeighted: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgVoteWeighted | MsgVoteWeighted[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Deposit defines a method to add deposit on a specific proposal.
 * @name deposit
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Deposit
 */
export declare const deposit: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDeposit | MsgDeposit[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateParams defines a governance operation for updating the x/gov module
 * parameters. The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CancelProposal defines a method to cancel governance proposal
 *
 * Since: cosmos-sdk 0.50
 * @name cancelProposal
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.CancelProposal
 */
export declare const cancelProposal: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCancelProposal | MsgCancelProposal[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map