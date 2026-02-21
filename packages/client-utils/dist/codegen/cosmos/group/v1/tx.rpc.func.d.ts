import { MsgCreateGroup, MsgUpdateGroupMembers, MsgUpdateGroupAdmin, MsgUpdateGroupMetadata, MsgCreateGroupPolicy, MsgCreateGroupWithPolicy, MsgUpdateGroupPolicyAdmin, MsgUpdateGroupPolicyDecisionPolicy, MsgUpdateGroupPolicyMetadata, MsgSubmitProposal, MsgWithdrawProposal, MsgVote, MsgExec, MsgLeaveGroup } from '@agoric/cosmic-proto/codegen/cosmos/group/v1/tx.js';
/**
 * CreateGroup creates a new group with an admin account address, a list of members and some optional metadata.
 * @name createGroup
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.CreateGroup
 */
export declare const createGroup: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateGroup | MsgCreateGroup[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateGroupMembers updates the group members with given group id and admin address.
 * @name updateGroupMembers
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.UpdateGroupMembers
 */
export declare const updateGroupMembers: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateGroupMembers | MsgUpdateGroupMembers[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateGroupAdmin updates the group admin with given group id and previous admin address.
 * @name updateGroupAdmin
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.UpdateGroupAdmin
 */
export declare const updateGroupAdmin: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateGroupAdmin | MsgUpdateGroupAdmin[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateGroupMetadata updates the group metadata with given group id and admin address.
 * @name updateGroupMetadata
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.UpdateGroupMetadata
 */
export declare const updateGroupMetadata: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateGroupMetadata | MsgUpdateGroupMetadata[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CreateGroupPolicy creates a new group policy using given DecisionPolicy.
 * @name createGroupPolicy
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.CreateGroupPolicy
 */
export declare const createGroupPolicy: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateGroupPolicy | MsgCreateGroupPolicy[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CreateGroupWithPolicy creates a new group with policy.
 * @name createGroupWithPolicy
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.CreateGroupWithPolicy
 */
export declare const createGroupWithPolicy: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateGroupWithPolicy | MsgCreateGroupWithPolicy[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateGroupPolicyAdmin updates a group policy admin.
 * @name updateGroupPolicyAdmin
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.UpdateGroupPolicyAdmin
 */
export declare const updateGroupPolicyAdmin: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateGroupPolicyAdmin | MsgUpdateGroupPolicyAdmin[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateGroupPolicyDecisionPolicy allows a group policy's decision policy to be updated.
 * @name updateGroupPolicyDecisionPolicy
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.UpdateGroupPolicyDecisionPolicy
 */
export declare const updateGroupPolicyDecisionPolicy: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateGroupPolicyDecisionPolicy | MsgUpdateGroupPolicyDecisionPolicy[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateGroupPolicyMetadata updates a group policy metadata.
 * @name updateGroupPolicyMetadata
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.UpdateGroupPolicyMetadata
 */
export declare const updateGroupPolicyMetadata: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateGroupPolicyMetadata | MsgUpdateGroupPolicyMetadata[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * SubmitProposal submits a new proposal.
 * @name submitProposal
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.SubmitProposal
 */
export declare const submitProposal: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSubmitProposal | MsgSubmitProposal[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * WithdrawProposal withdraws a proposal.
 * @name withdrawProposal
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.WithdrawProposal
 */
export declare const withdrawProposal: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWithdrawProposal | MsgWithdrawProposal[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Vote allows a voter to vote on a proposal.
 * @name vote
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.Vote
 */
export declare const vote: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgVote | MsgVote[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Exec executes a proposal.
 * @name exec
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.Exec
 */
export declare const exec: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgExec | MsgExec[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * LeaveGroup allows a group member to leave the group.
 * @name leaveGroup
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.LeaveGroup
 */
export declare const leaveGroup: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgLeaveGroup | MsgLeaveGroup[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map