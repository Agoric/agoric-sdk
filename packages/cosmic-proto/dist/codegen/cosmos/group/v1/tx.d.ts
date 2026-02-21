import { MemberRequest, type MemberRequestSDKType, VoteOption, ProposalExecutorResult, ThresholdDecisionPolicy, type ThresholdDecisionPolicySDKType, PercentageDecisionPolicy, type PercentageDecisionPolicySDKType } from './types.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/** Exec defines modes of execution of a proposal on creation or on new vote. */
export declare enum Exec {
    /**
     * EXEC_UNSPECIFIED - An empty value means that there should be a separate
     * MsgExec request for the proposal to execute.
     */
    EXEC_UNSPECIFIED = 0,
    /**
     * EXEC_TRY - Try to execute the proposal immediately.
     * If the proposal is not allowed per the DecisionPolicy,
     * the proposal will still be open and could
     * be executed at a later point.
     */
    EXEC_TRY = 1,
    UNRECOGNIZED = -1
}
export declare const ExecSDKType: typeof Exec;
export declare function execFromJSON(object: any): Exec;
export declare function execToJSON(object: Exec): string;
/**
 * MsgCreateGroup is the Msg/CreateGroup request type.
 * @name MsgCreateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroup
 */
export interface MsgCreateGroup {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * members defines the group members.
     */
    members: MemberRequest[];
    /**
     * metadata is any arbitrary metadata to attached to the group.
     */
    metadata: string;
}
export interface MsgCreateGroupProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgCreateGroup';
    value: Uint8Array;
}
/**
 * MsgCreateGroup is the Msg/CreateGroup request type.
 * @name MsgCreateGroupSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroup
 */
export interface MsgCreateGroupSDKType {
    admin: string;
    members: MemberRequestSDKType[];
    metadata: string;
}
/**
 * MsgCreateGroupResponse is the Msg/CreateGroup response type.
 * @name MsgCreateGroupResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupResponse
 */
export interface MsgCreateGroupResponse {
    /**
     * group_id is the unique ID of the newly created group.
     */
    groupId: bigint;
}
export interface MsgCreateGroupResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgCreateGroupResponse';
    value: Uint8Array;
}
/**
 * MsgCreateGroupResponse is the Msg/CreateGroup response type.
 * @name MsgCreateGroupResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupResponse
 */
export interface MsgCreateGroupResponseSDKType {
    group_id: bigint;
}
/**
 * MsgUpdateGroupMembers is the Msg/UpdateGroupMembers request type.
 * @name MsgUpdateGroupMembers
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembers
 */
export interface MsgUpdateGroupMembers {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * group_id is the unique ID of the group.
     */
    groupId: bigint;
    /**
     * member_updates is the list of members to update,
     * set weight to 0 to remove a member.
     */
    memberUpdates: MemberRequest[];
}
export interface MsgUpdateGroupMembersProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupMembers';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupMembers is the Msg/UpdateGroupMembers request type.
 * @name MsgUpdateGroupMembersSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembers
 */
export interface MsgUpdateGroupMembersSDKType {
    admin: string;
    group_id: bigint;
    member_updates: MemberRequestSDKType[];
}
/**
 * MsgUpdateGroupMembersResponse is the Msg/UpdateGroupMembers response type.
 * @name MsgUpdateGroupMembersResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembersResponse
 */
export interface MsgUpdateGroupMembersResponse {
}
export interface MsgUpdateGroupMembersResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupMembersResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupMembersResponse is the Msg/UpdateGroupMembers response type.
 * @name MsgUpdateGroupMembersResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembersResponse
 */
export interface MsgUpdateGroupMembersResponseSDKType {
}
/**
 * MsgUpdateGroupAdmin is the Msg/UpdateGroupAdmin request type.
 * @name MsgUpdateGroupAdmin
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdmin
 */
export interface MsgUpdateGroupAdmin {
    /**
     * admin is the current account address of the group admin.
     */
    admin: string;
    /**
     * group_id is the unique ID of the group.
     */
    groupId: bigint;
    /**
     * new_admin is the group new admin account address.
     */
    newAdmin: string;
}
export interface MsgUpdateGroupAdminProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupAdmin';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupAdmin is the Msg/UpdateGroupAdmin request type.
 * @name MsgUpdateGroupAdminSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdmin
 */
export interface MsgUpdateGroupAdminSDKType {
    admin: string;
    group_id: bigint;
    new_admin: string;
}
/**
 * MsgUpdateGroupAdminResponse is the Msg/UpdateGroupAdmin response type.
 * @name MsgUpdateGroupAdminResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdminResponse
 */
export interface MsgUpdateGroupAdminResponse {
}
export interface MsgUpdateGroupAdminResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupAdminResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupAdminResponse is the Msg/UpdateGroupAdmin response type.
 * @name MsgUpdateGroupAdminResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdminResponse
 */
export interface MsgUpdateGroupAdminResponseSDKType {
}
/**
 * MsgUpdateGroupMetadata is the Msg/UpdateGroupMetadata request type.
 * @name MsgUpdateGroupMetadata
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadata
 */
export interface MsgUpdateGroupMetadata {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * group_id is the unique ID of the group.
     */
    groupId: bigint;
    /**
     * metadata is the updated group's metadata.
     */
    metadata: string;
}
export interface MsgUpdateGroupMetadataProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupMetadata';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupMetadata is the Msg/UpdateGroupMetadata request type.
 * @name MsgUpdateGroupMetadataSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadata
 */
export interface MsgUpdateGroupMetadataSDKType {
    admin: string;
    group_id: bigint;
    metadata: string;
}
/**
 * MsgUpdateGroupMetadataResponse is the Msg/UpdateGroupMetadata response type.
 * @name MsgUpdateGroupMetadataResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadataResponse
 */
export interface MsgUpdateGroupMetadataResponse {
}
export interface MsgUpdateGroupMetadataResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupMetadataResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupMetadataResponse is the Msg/UpdateGroupMetadata response type.
 * @name MsgUpdateGroupMetadataResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadataResponse
 */
export interface MsgUpdateGroupMetadataResponseSDKType {
}
/**
 * MsgCreateGroupPolicy is the Msg/CreateGroupPolicy request type.
 * @name MsgCreateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicy
 */
export interface MsgCreateGroupPolicy {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * group_id is the unique ID of the group.
     */
    groupId: bigint;
    /**
     * metadata is any arbitrary metadata attached to the group policy.
     */
    metadata: string;
    /**
     * decision_policy specifies the group policy's decision policy.
     */
    decisionPolicy?: ThresholdDecisionPolicy | PercentageDecisionPolicy | Any | undefined;
}
export interface MsgCreateGroupPolicyProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgCreateGroupPolicy';
    value: Uint8Array;
}
/**
 * MsgCreateGroupPolicy is the Msg/CreateGroupPolicy request type.
 * @name MsgCreateGroupPolicySDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicy
 */
export interface MsgCreateGroupPolicySDKType {
    admin: string;
    group_id: bigint;
    metadata: string;
    decision_policy?: ThresholdDecisionPolicySDKType | PercentageDecisionPolicySDKType | AnySDKType | undefined;
}
/**
 * MsgCreateGroupPolicyResponse is the Msg/CreateGroupPolicy response type.
 * @name MsgCreateGroupPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicyResponse
 */
export interface MsgCreateGroupPolicyResponse {
    /**
     * address is the account address of the newly created group policy.
     */
    address: string;
}
export interface MsgCreateGroupPolicyResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgCreateGroupPolicyResponse';
    value: Uint8Array;
}
/**
 * MsgCreateGroupPolicyResponse is the Msg/CreateGroupPolicy response type.
 * @name MsgCreateGroupPolicyResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicyResponse
 */
export interface MsgCreateGroupPolicyResponseSDKType {
    address: string;
}
/**
 * MsgUpdateGroupPolicyAdmin is the Msg/UpdateGroupPolicyAdmin request type.
 * @name MsgUpdateGroupPolicyAdmin
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdmin
 */
export interface MsgUpdateGroupPolicyAdmin {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * group_policy_address is the account address of the group policy.
     */
    groupPolicyAddress: string;
    /**
     * new_admin is the new group policy admin.
     */
    newAdmin: string;
}
export interface MsgUpdateGroupPolicyAdminProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyAdmin';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupPolicyAdmin is the Msg/UpdateGroupPolicyAdmin request type.
 * @name MsgUpdateGroupPolicyAdminSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdmin
 */
export interface MsgUpdateGroupPolicyAdminSDKType {
    admin: string;
    group_policy_address: string;
    new_admin: string;
}
/**
 * MsgUpdateGroupPolicyAdminResponse is the Msg/UpdateGroupPolicyAdmin response type.
 * @name MsgUpdateGroupPolicyAdminResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse
 */
export interface MsgUpdateGroupPolicyAdminResponse {
}
export interface MsgUpdateGroupPolicyAdminResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupPolicyAdminResponse is the Msg/UpdateGroupPolicyAdmin response type.
 * @name MsgUpdateGroupPolicyAdminResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse
 */
export interface MsgUpdateGroupPolicyAdminResponseSDKType {
}
/**
 * MsgCreateGroupWithPolicy is the Msg/CreateGroupWithPolicy request type.
 * @name MsgCreateGroupWithPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicy
 */
export interface MsgCreateGroupWithPolicy {
    /**
     * admin is the account address of the group and group policy admin.
     */
    admin: string;
    /**
     * members defines the group members.
     */
    members: MemberRequest[];
    /**
     * group_metadata is any arbitrary metadata attached to the group.
     */
    groupMetadata: string;
    /**
     * group_policy_metadata is any arbitrary metadata attached to the group policy.
     */
    groupPolicyMetadata: string;
    /**
     * group_policy_as_admin is a boolean field, if set to true, the group policy account address will be used as group
     * and group policy admin.
     */
    groupPolicyAsAdmin: boolean;
    /**
     * decision_policy specifies the group policy's decision policy.
     */
    decisionPolicy?: ThresholdDecisionPolicy | PercentageDecisionPolicy | Any | undefined;
}
export interface MsgCreateGroupWithPolicyProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgCreateGroupWithPolicy';
    value: Uint8Array;
}
/**
 * MsgCreateGroupWithPolicy is the Msg/CreateGroupWithPolicy request type.
 * @name MsgCreateGroupWithPolicySDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicy
 */
export interface MsgCreateGroupWithPolicySDKType {
    admin: string;
    members: MemberRequestSDKType[];
    group_metadata: string;
    group_policy_metadata: string;
    group_policy_as_admin: boolean;
    decision_policy?: ThresholdDecisionPolicySDKType | PercentageDecisionPolicySDKType | AnySDKType | undefined;
}
/**
 * MsgCreateGroupWithPolicyResponse is the Msg/CreateGroupWithPolicy response type.
 * @name MsgCreateGroupWithPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicyResponse
 */
export interface MsgCreateGroupWithPolicyResponse {
    /**
     * group_id is the unique ID of the newly created group with policy.
     */
    groupId: bigint;
    /**
     * group_policy_address is the account address of the newly created group policy.
     */
    groupPolicyAddress: string;
}
export interface MsgCreateGroupWithPolicyResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgCreateGroupWithPolicyResponse';
    value: Uint8Array;
}
/**
 * MsgCreateGroupWithPolicyResponse is the Msg/CreateGroupWithPolicy response type.
 * @name MsgCreateGroupWithPolicyResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicyResponse
 */
export interface MsgCreateGroupWithPolicyResponseSDKType {
    group_id: bigint;
    group_policy_address: string;
}
/**
 * MsgUpdateGroupPolicyDecisionPolicy is the Msg/UpdateGroupPolicyDecisionPolicy request type.
 * @name MsgUpdateGroupPolicyDecisionPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy
 */
export interface MsgUpdateGroupPolicyDecisionPolicy {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * group_policy_address is the account address of group policy.
     */
    groupPolicyAddress: string;
    /**
     * decision_policy is the updated group policy's decision policy.
     */
    decisionPolicy?: ThresholdDecisionPolicy | PercentageDecisionPolicy | Any | undefined;
}
export interface MsgUpdateGroupPolicyDecisionPolicyProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupPolicyDecisionPolicy is the Msg/UpdateGroupPolicyDecisionPolicy request type.
 * @name MsgUpdateGroupPolicyDecisionPolicySDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy
 */
export interface MsgUpdateGroupPolicyDecisionPolicySDKType {
    admin: string;
    group_policy_address: string;
    decision_policy?: ThresholdDecisionPolicySDKType | PercentageDecisionPolicySDKType | AnySDKType | undefined;
}
/**
 * MsgUpdateGroupPolicyDecisionPolicyResponse is the Msg/UpdateGroupPolicyDecisionPolicy response type.
 * @name MsgUpdateGroupPolicyDecisionPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse
 */
export interface MsgUpdateGroupPolicyDecisionPolicyResponse {
}
export interface MsgUpdateGroupPolicyDecisionPolicyResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupPolicyDecisionPolicyResponse is the Msg/UpdateGroupPolicyDecisionPolicy response type.
 * @name MsgUpdateGroupPolicyDecisionPolicyResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse
 */
export interface MsgUpdateGroupPolicyDecisionPolicyResponseSDKType {
}
/**
 * MsgUpdateGroupPolicyMetadata is the Msg/UpdateGroupPolicyMetadata request type.
 * @name MsgUpdateGroupPolicyMetadata
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadata
 */
export interface MsgUpdateGroupPolicyMetadata {
    /**
     * admin is the account address of the group admin.
     */
    admin: string;
    /**
     * group_policy_address is the account address of group policy.
     */
    groupPolicyAddress: string;
    /**
     * metadata is the group policy metadata to be updated.
     */
    metadata: string;
}
export interface MsgUpdateGroupPolicyMetadataProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyMetadata';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupPolicyMetadata is the Msg/UpdateGroupPolicyMetadata request type.
 * @name MsgUpdateGroupPolicyMetadataSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadata
 */
export interface MsgUpdateGroupPolicyMetadataSDKType {
    admin: string;
    group_policy_address: string;
    metadata: string;
}
/**
 * MsgUpdateGroupPolicyMetadataResponse is the Msg/UpdateGroupPolicyMetadata response type.
 * @name MsgUpdateGroupPolicyMetadataResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse
 */
export interface MsgUpdateGroupPolicyMetadataResponse {
}
export interface MsgUpdateGroupPolicyMetadataResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateGroupPolicyMetadataResponse is the Msg/UpdateGroupPolicyMetadata response type.
 * @name MsgUpdateGroupPolicyMetadataResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse
 */
export interface MsgUpdateGroupPolicyMetadataResponseSDKType {
}
/**
 * MsgSubmitProposal is the Msg/SubmitProposal request type.
 * @name MsgSubmitProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposal
 */
export interface MsgSubmitProposal {
    /**
     * group_policy_address is the account address of group policy.
     */
    groupPolicyAddress: string;
    /**
     * proposers are the account addresses of the proposers.
     * Proposers signatures will be counted as yes votes.
     */
    proposers: string[];
    /**
     * metadata is any arbitrary metadata attached to the proposal.
     */
    metadata: string;
    /**
     * messages is a list of `sdk.Msg`s that will be executed if the proposal passes.
     */
    messages: Any[];
    /**
     * exec defines the mode of execution of the proposal,
     * whether it should be executed immediately on creation or not.
     * If so, proposers signatures are considered as Yes votes.
     */
    exec: Exec;
    /**
     * title is the title of the proposal.
     *
     * Since: cosmos-sdk 0.47
     */
    title: string;
    /**
     * summary is the summary of the proposal.
     *
     * Since: cosmos-sdk 0.47
     */
    summary: string;
}
export interface MsgSubmitProposalProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgSubmitProposal';
    value: Uint8Array;
}
/**
 * MsgSubmitProposal is the Msg/SubmitProposal request type.
 * @name MsgSubmitProposalSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposal
 */
export interface MsgSubmitProposalSDKType {
    group_policy_address: string;
    proposers: string[];
    metadata: string;
    messages: AnySDKType[];
    exec: Exec;
    title: string;
    summary: string;
}
/**
 * MsgSubmitProposalResponse is the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposalResponse
 */
export interface MsgSubmitProposalResponse {
    /**
     * proposal is the unique ID of the proposal.
     */
    proposalId: bigint;
}
export interface MsgSubmitProposalResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgSubmitProposalResponse';
    value: Uint8Array;
}
/**
 * MsgSubmitProposalResponse is the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposalResponse
 */
export interface MsgSubmitProposalResponseSDKType {
    proposal_id: bigint;
}
/**
 * MsgWithdrawProposal is the Msg/WithdrawProposal request type.
 * @name MsgWithdrawProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposal
 */
export interface MsgWithdrawProposal {
    /**
     * proposal is the unique ID of the proposal.
     */
    proposalId: bigint;
    /**
     * address is the admin of the group policy or one of the proposer of the proposal.
     */
    address: string;
}
export interface MsgWithdrawProposalProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgWithdrawProposal';
    value: Uint8Array;
}
/**
 * MsgWithdrawProposal is the Msg/WithdrawProposal request type.
 * @name MsgWithdrawProposalSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposal
 */
export interface MsgWithdrawProposalSDKType {
    proposal_id: bigint;
    address: string;
}
/**
 * MsgWithdrawProposalResponse is the Msg/WithdrawProposal response type.
 * @name MsgWithdrawProposalResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposalResponse
 */
export interface MsgWithdrawProposalResponse {
}
export interface MsgWithdrawProposalResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgWithdrawProposalResponse';
    value: Uint8Array;
}
/**
 * MsgWithdrawProposalResponse is the Msg/WithdrawProposal response type.
 * @name MsgWithdrawProposalResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposalResponse
 */
export interface MsgWithdrawProposalResponseSDKType {
}
/**
 * MsgVote is the Msg/Vote request type.
 * @name MsgVote
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVote
 */
export interface MsgVote {
    /**
     * proposal is the unique ID of the proposal.
     */
    proposalId: bigint;
    /**
     * voter is the voter account address.
     */
    voter: string;
    /**
     * option is the voter's choice on the proposal.
     */
    option: VoteOption;
    /**
     * metadata is any arbitrary metadata attached to the vote.
     */
    metadata: string;
    /**
     * exec defines whether the proposal should be executed
     * immediately after voting or not.
     */
    exec: Exec;
}
export interface MsgVoteProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgVote';
    value: Uint8Array;
}
/**
 * MsgVote is the Msg/Vote request type.
 * @name MsgVoteSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVote
 */
export interface MsgVoteSDKType {
    proposal_id: bigint;
    voter: string;
    option: VoteOption;
    metadata: string;
    exec: Exec;
}
/**
 * MsgVoteResponse is the Msg/Vote response type.
 * @name MsgVoteResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVoteResponse
 */
export interface MsgVoteResponse {
}
export interface MsgVoteResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgVoteResponse';
    value: Uint8Array;
}
/**
 * MsgVoteResponse is the Msg/Vote response type.
 * @name MsgVoteResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVoteResponse
 */
export interface MsgVoteResponseSDKType {
}
/**
 * MsgExec is the Msg/Exec request type.
 * @name MsgExec
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExec
 */
export interface MsgExec {
    /**
     * proposal is the unique ID of the proposal.
     */
    proposalId: bigint;
    /**
     * executor is the account address used to execute the proposal.
     */
    executor: string;
}
export interface MsgExecProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgExec';
    value: Uint8Array;
}
/**
 * MsgExec is the Msg/Exec request type.
 * @name MsgExecSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExec
 */
export interface MsgExecSDKType {
    proposal_id: bigint;
    executor: string;
}
/**
 * MsgExecResponse is the Msg/Exec request type.
 * @name MsgExecResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExecResponse
 */
export interface MsgExecResponse {
    /**
     * result is the final result of the proposal execution.
     */
    result: ProposalExecutorResult;
}
export interface MsgExecResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgExecResponse';
    value: Uint8Array;
}
/**
 * MsgExecResponse is the Msg/Exec request type.
 * @name MsgExecResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExecResponse
 */
export interface MsgExecResponseSDKType {
    result: ProposalExecutorResult;
}
/**
 * MsgLeaveGroup is the Msg/LeaveGroup request type.
 * @name MsgLeaveGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroup
 */
export interface MsgLeaveGroup {
    /**
     * address is the account address of the group member.
     */
    address: string;
    /**
     * group_id is the unique ID of the group.
     */
    groupId: bigint;
}
export interface MsgLeaveGroupProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgLeaveGroup';
    value: Uint8Array;
}
/**
 * MsgLeaveGroup is the Msg/LeaveGroup request type.
 * @name MsgLeaveGroupSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroup
 */
export interface MsgLeaveGroupSDKType {
    address: string;
    group_id: bigint;
}
/**
 * MsgLeaveGroupResponse is the Msg/LeaveGroup response type.
 * @name MsgLeaveGroupResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroupResponse
 */
export interface MsgLeaveGroupResponse {
}
export interface MsgLeaveGroupResponseProtoMsg {
    typeUrl: '/cosmos.group.v1.MsgLeaveGroupResponse';
    value: Uint8Array;
}
/**
 * MsgLeaveGroupResponse is the Msg/LeaveGroup response type.
 * @name MsgLeaveGroupResponseSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroupResponse
 */
export interface MsgLeaveGroupResponseSDKType {
}
/**
 * MsgCreateGroup is the Msg/CreateGroup request type.
 * @name MsgCreateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroup
 */
export declare const MsgCreateGroup: {
    typeUrl: "/cosmos.group.v1.MsgCreateGroup";
    aminoType: "cosmos-sdk/MsgCreateGroup";
    is(o: any): o is MsgCreateGroup;
    isSDK(o: any): o is MsgCreateGroupSDKType;
    encode(message: MsgCreateGroup, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroup;
    fromJSON(object: any): MsgCreateGroup;
    toJSON(message: MsgCreateGroup): JsonSafe<MsgCreateGroup>;
    fromPartial(object: Partial<MsgCreateGroup>): MsgCreateGroup;
    fromProtoMsg(message: MsgCreateGroupProtoMsg): MsgCreateGroup;
    toProto(message: MsgCreateGroup): Uint8Array;
    toProtoMsg(message: MsgCreateGroup): MsgCreateGroupProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateGroupResponse is the Msg/CreateGroup response type.
 * @name MsgCreateGroupResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupResponse
 */
export declare const MsgCreateGroupResponse: {
    typeUrl: "/cosmos.group.v1.MsgCreateGroupResponse";
    aminoType: "cosmos-sdk/MsgCreateGroupResponse";
    is(o: any): o is MsgCreateGroupResponse;
    isSDK(o: any): o is MsgCreateGroupResponseSDKType;
    encode(message: MsgCreateGroupResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroupResponse;
    fromJSON(object: any): MsgCreateGroupResponse;
    toJSON(message: MsgCreateGroupResponse): JsonSafe<MsgCreateGroupResponse>;
    fromPartial(object: Partial<MsgCreateGroupResponse>): MsgCreateGroupResponse;
    fromProtoMsg(message: MsgCreateGroupResponseProtoMsg): MsgCreateGroupResponse;
    toProto(message: MsgCreateGroupResponse): Uint8Array;
    toProtoMsg(message: MsgCreateGroupResponse): MsgCreateGroupResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupMembers is the Msg/UpdateGroupMembers request type.
 * @name MsgUpdateGroupMembers
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembers
 */
export declare const MsgUpdateGroupMembers: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupMembers";
    aminoType: "cosmos-sdk/MsgUpdateGroupMembers";
    is(o: any): o is MsgUpdateGroupMembers;
    isSDK(o: any): o is MsgUpdateGroupMembersSDKType;
    encode(message: MsgUpdateGroupMembers, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupMembers;
    fromJSON(object: any): MsgUpdateGroupMembers;
    toJSON(message: MsgUpdateGroupMembers): JsonSafe<MsgUpdateGroupMembers>;
    fromPartial(object: Partial<MsgUpdateGroupMembers>): MsgUpdateGroupMembers;
    fromProtoMsg(message: MsgUpdateGroupMembersProtoMsg): MsgUpdateGroupMembers;
    toProto(message: MsgUpdateGroupMembers): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupMembers): MsgUpdateGroupMembersProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupMembersResponse is the Msg/UpdateGroupMembers response type.
 * @name MsgUpdateGroupMembersResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembersResponse
 */
export declare const MsgUpdateGroupMembersResponse: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupMembersResponse";
    aminoType: "cosmos-sdk/MsgUpdateGroupMembersResponse";
    is(o: any): o is MsgUpdateGroupMembersResponse;
    isSDK(o: any): o is MsgUpdateGroupMembersResponseSDKType;
    encode(_: MsgUpdateGroupMembersResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupMembersResponse;
    fromJSON(_: any): MsgUpdateGroupMembersResponse;
    toJSON(_: MsgUpdateGroupMembersResponse): JsonSafe<MsgUpdateGroupMembersResponse>;
    fromPartial(_: Partial<MsgUpdateGroupMembersResponse>): MsgUpdateGroupMembersResponse;
    fromProtoMsg(message: MsgUpdateGroupMembersResponseProtoMsg): MsgUpdateGroupMembersResponse;
    toProto(message: MsgUpdateGroupMembersResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupMembersResponse): MsgUpdateGroupMembersResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupAdmin is the Msg/UpdateGroupAdmin request type.
 * @name MsgUpdateGroupAdmin
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdmin
 */
export declare const MsgUpdateGroupAdmin: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupAdmin";
    aminoType: "cosmos-sdk/MsgUpdateGroupAdmin";
    is(o: any): o is MsgUpdateGroupAdmin;
    isSDK(o: any): o is MsgUpdateGroupAdminSDKType;
    encode(message: MsgUpdateGroupAdmin, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupAdmin;
    fromJSON(object: any): MsgUpdateGroupAdmin;
    toJSON(message: MsgUpdateGroupAdmin): JsonSafe<MsgUpdateGroupAdmin>;
    fromPartial(object: Partial<MsgUpdateGroupAdmin>): MsgUpdateGroupAdmin;
    fromProtoMsg(message: MsgUpdateGroupAdminProtoMsg): MsgUpdateGroupAdmin;
    toProto(message: MsgUpdateGroupAdmin): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupAdmin): MsgUpdateGroupAdminProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupAdminResponse is the Msg/UpdateGroupAdmin response type.
 * @name MsgUpdateGroupAdminResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdminResponse
 */
export declare const MsgUpdateGroupAdminResponse: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupAdminResponse";
    aminoType: "cosmos-sdk/MsgUpdateGroupAdminResponse";
    is(o: any): o is MsgUpdateGroupAdminResponse;
    isSDK(o: any): o is MsgUpdateGroupAdminResponseSDKType;
    encode(_: MsgUpdateGroupAdminResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupAdminResponse;
    fromJSON(_: any): MsgUpdateGroupAdminResponse;
    toJSON(_: MsgUpdateGroupAdminResponse): JsonSafe<MsgUpdateGroupAdminResponse>;
    fromPartial(_: Partial<MsgUpdateGroupAdminResponse>): MsgUpdateGroupAdminResponse;
    fromProtoMsg(message: MsgUpdateGroupAdminResponseProtoMsg): MsgUpdateGroupAdminResponse;
    toProto(message: MsgUpdateGroupAdminResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupAdminResponse): MsgUpdateGroupAdminResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupMetadata is the Msg/UpdateGroupMetadata request type.
 * @name MsgUpdateGroupMetadata
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadata
 */
export declare const MsgUpdateGroupMetadata: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupMetadata";
    aminoType: "cosmos-sdk/MsgUpdateGroupMetadata";
    is(o: any): o is MsgUpdateGroupMetadata;
    isSDK(o: any): o is MsgUpdateGroupMetadataSDKType;
    encode(message: MsgUpdateGroupMetadata, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupMetadata;
    fromJSON(object: any): MsgUpdateGroupMetadata;
    toJSON(message: MsgUpdateGroupMetadata): JsonSafe<MsgUpdateGroupMetadata>;
    fromPartial(object: Partial<MsgUpdateGroupMetadata>): MsgUpdateGroupMetadata;
    fromProtoMsg(message: MsgUpdateGroupMetadataProtoMsg): MsgUpdateGroupMetadata;
    toProto(message: MsgUpdateGroupMetadata): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupMetadata): MsgUpdateGroupMetadataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupMetadataResponse is the Msg/UpdateGroupMetadata response type.
 * @name MsgUpdateGroupMetadataResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadataResponse
 */
export declare const MsgUpdateGroupMetadataResponse: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupMetadataResponse";
    aminoType: "cosmos-sdk/MsgUpdateGroupMetadataResponse";
    is(o: any): o is MsgUpdateGroupMetadataResponse;
    isSDK(o: any): o is MsgUpdateGroupMetadataResponseSDKType;
    encode(_: MsgUpdateGroupMetadataResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupMetadataResponse;
    fromJSON(_: any): MsgUpdateGroupMetadataResponse;
    toJSON(_: MsgUpdateGroupMetadataResponse): JsonSafe<MsgUpdateGroupMetadataResponse>;
    fromPartial(_: Partial<MsgUpdateGroupMetadataResponse>): MsgUpdateGroupMetadataResponse;
    fromProtoMsg(message: MsgUpdateGroupMetadataResponseProtoMsg): MsgUpdateGroupMetadataResponse;
    toProto(message: MsgUpdateGroupMetadataResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupMetadataResponse): MsgUpdateGroupMetadataResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateGroupPolicy is the Msg/CreateGroupPolicy request type.
 * @name MsgCreateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicy
 */
export declare const MsgCreateGroupPolicy: {
    typeUrl: "/cosmos.group.v1.MsgCreateGroupPolicy";
    aminoType: "cosmos-sdk/MsgCreateGroupPolicy";
    is(o: any): o is MsgCreateGroupPolicy;
    isSDK(o: any): o is MsgCreateGroupPolicySDKType;
    encode(message: MsgCreateGroupPolicy, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroupPolicy;
    fromJSON(object: any): MsgCreateGroupPolicy;
    toJSON(message: MsgCreateGroupPolicy): JsonSafe<MsgCreateGroupPolicy>;
    fromPartial(object: Partial<MsgCreateGroupPolicy>): MsgCreateGroupPolicy;
    fromProtoMsg(message: MsgCreateGroupPolicyProtoMsg): MsgCreateGroupPolicy;
    toProto(message: MsgCreateGroupPolicy): Uint8Array;
    toProtoMsg(message: MsgCreateGroupPolicy): MsgCreateGroupPolicyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateGroupPolicyResponse is the Msg/CreateGroupPolicy response type.
 * @name MsgCreateGroupPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicyResponse
 */
export declare const MsgCreateGroupPolicyResponse: {
    typeUrl: "/cosmos.group.v1.MsgCreateGroupPolicyResponse";
    aminoType: "cosmos-sdk/MsgCreateGroupPolicyResponse";
    is(o: any): o is MsgCreateGroupPolicyResponse;
    isSDK(o: any): o is MsgCreateGroupPolicyResponseSDKType;
    encode(message: MsgCreateGroupPolicyResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroupPolicyResponse;
    fromJSON(object: any): MsgCreateGroupPolicyResponse;
    toJSON(message: MsgCreateGroupPolicyResponse): JsonSafe<MsgCreateGroupPolicyResponse>;
    fromPartial(object: Partial<MsgCreateGroupPolicyResponse>): MsgCreateGroupPolicyResponse;
    fromProtoMsg(message: MsgCreateGroupPolicyResponseProtoMsg): MsgCreateGroupPolicyResponse;
    toProto(message: MsgCreateGroupPolicyResponse): Uint8Array;
    toProtoMsg(message: MsgCreateGroupPolicyResponse): MsgCreateGroupPolicyResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupPolicyAdmin is the Msg/UpdateGroupPolicyAdmin request type.
 * @name MsgUpdateGroupPolicyAdmin
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdmin
 */
export declare const MsgUpdateGroupPolicyAdmin: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupPolicyAdmin";
    aminoType: "cosmos-sdk/MsgUpdateGroupPolicyAdmin";
    is(o: any): o is MsgUpdateGroupPolicyAdmin;
    isSDK(o: any): o is MsgUpdateGroupPolicyAdminSDKType;
    encode(message: MsgUpdateGroupPolicyAdmin, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupPolicyAdmin;
    fromJSON(object: any): MsgUpdateGroupPolicyAdmin;
    toJSON(message: MsgUpdateGroupPolicyAdmin): JsonSafe<MsgUpdateGroupPolicyAdmin>;
    fromPartial(object: Partial<MsgUpdateGroupPolicyAdmin>): MsgUpdateGroupPolicyAdmin;
    fromProtoMsg(message: MsgUpdateGroupPolicyAdminProtoMsg): MsgUpdateGroupPolicyAdmin;
    toProto(message: MsgUpdateGroupPolicyAdmin): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupPolicyAdmin): MsgUpdateGroupPolicyAdminProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupPolicyAdminResponse is the Msg/UpdateGroupPolicyAdmin response type.
 * @name MsgUpdateGroupPolicyAdminResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse
 */
export declare const MsgUpdateGroupPolicyAdminResponse: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse";
    aminoType: "cosmos-sdk/MsgUpdateGroupPolicyAdminResponse";
    is(o: any): o is MsgUpdateGroupPolicyAdminResponse;
    isSDK(o: any): o is MsgUpdateGroupPolicyAdminResponseSDKType;
    encode(_: MsgUpdateGroupPolicyAdminResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupPolicyAdminResponse;
    fromJSON(_: any): MsgUpdateGroupPolicyAdminResponse;
    toJSON(_: MsgUpdateGroupPolicyAdminResponse): JsonSafe<MsgUpdateGroupPolicyAdminResponse>;
    fromPartial(_: Partial<MsgUpdateGroupPolicyAdminResponse>): MsgUpdateGroupPolicyAdminResponse;
    fromProtoMsg(message: MsgUpdateGroupPolicyAdminResponseProtoMsg): MsgUpdateGroupPolicyAdminResponse;
    toProto(message: MsgUpdateGroupPolicyAdminResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupPolicyAdminResponse): MsgUpdateGroupPolicyAdminResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateGroupWithPolicy is the Msg/CreateGroupWithPolicy request type.
 * @name MsgCreateGroupWithPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicy
 */
export declare const MsgCreateGroupWithPolicy: {
    typeUrl: "/cosmos.group.v1.MsgCreateGroupWithPolicy";
    aminoType: "cosmos-sdk/MsgCreateGroupWithPolicy";
    is(o: any): o is MsgCreateGroupWithPolicy;
    isSDK(o: any): o is MsgCreateGroupWithPolicySDKType;
    encode(message: MsgCreateGroupWithPolicy, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroupWithPolicy;
    fromJSON(object: any): MsgCreateGroupWithPolicy;
    toJSON(message: MsgCreateGroupWithPolicy): JsonSafe<MsgCreateGroupWithPolicy>;
    fromPartial(object: Partial<MsgCreateGroupWithPolicy>): MsgCreateGroupWithPolicy;
    fromProtoMsg(message: MsgCreateGroupWithPolicyProtoMsg): MsgCreateGroupWithPolicy;
    toProto(message: MsgCreateGroupWithPolicy): Uint8Array;
    toProtoMsg(message: MsgCreateGroupWithPolicy): MsgCreateGroupWithPolicyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateGroupWithPolicyResponse is the Msg/CreateGroupWithPolicy response type.
 * @name MsgCreateGroupWithPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicyResponse
 */
export declare const MsgCreateGroupWithPolicyResponse: {
    typeUrl: "/cosmos.group.v1.MsgCreateGroupWithPolicyResponse";
    aminoType: "cosmos-sdk/MsgCreateGroupWithPolicyResponse";
    is(o: any): o is MsgCreateGroupWithPolicyResponse;
    isSDK(o: any): o is MsgCreateGroupWithPolicyResponseSDKType;
    encode(message: MsgCreateGroupWithPolicyResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroupWithPolicyResponse;
    fromJSON(object: any): MsgCreateGroupWithPolicyResponse;
    toJSON(message: MsgCreateGroupWithPolicyResponse): JsonSafe<MsgCreateGroupWithPolicyResponse>;
    fromPartial(object: Partial<MsgCreateGroupWithPolicyResponse>): MsgCreateGroupWithPolicyResponse;
    fromProtoMsg(message: MsgCreateGroupWithPolicyResponseProtoMsg): MsgCreateGroupWithPolicyResponse;
    toProto(message: MsgCreateGroupWithPolicyResponse): Uint8Array;
    toProtoMsg(message: MsgCreateGroupWithPolicyResponse): MsgCreateGroupWithPolicyResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupPolicyDecisionPolicy is the Msg/UpdateGroupPolicyDecisionPolicy request type.
 * @name MsgUpdateGroupPolicyDecisionPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy
 */
export declare const MsgUpdateGroupPolicyDecisionPolicy: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy";
    aminoType: "cosmos-sdk/MsgUpdateGroupDecisionPolicy";
    is(o: any): o is MsgUpdateGroupPolicyDecisionPolicy;
    isSDK(o: any): o is MsgUpdateGroupPolicyDecisionPolicySDKType;
    encode(message: MsgUpdateGroupPolicyDecisionPolicy, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupPolicyDecisionPolicy;
    fromJSON(object: any): MsgUpdateGroupPolicyDecisionPolicy;
    toJSON(message: MsgUpdateGroupPolicyDecisionPolicy): JsonSafe<MsgUpdateGroupPolicyDecisionPolicy>;
    fromPartial(object: Partial<MsgUpdateGroupPolicyDecisionPolicy>): MsgUpdateGroupPolicyDecisionPolicy;
    fromProtoMsg(message: MsgUpdateGroupPolicyDecisionPolicyProtoMsg): MsgUpdateGroupPolicyDecisionPolicy;
    toProto(message: MsgUpdateGroupPolicyDecisionPolicy): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupPolicyDecisionPolicy): MsgUpdateGroupPolicyDecisionPolicyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupPolicyDecisionPolicyResponse is the Msg/UpdateGroupPolicyDecisionPolicy response type.
 * @name MsgUpdateGroupPolicyDecisionPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse
 */
export declare const MsgUpdateGroupPolicyDecisionPolicyResponse: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse";
    aminoType: "cosmos-sdk/MsgUpdateGroupPolicyDecisionPolicyResponse";
    is(o: any): o is MsgUpdateGroupPolicyDecisionPolicyResponse;
    isSDK(o: any): o is MsgUpdateGroupPolicyDecisionPolicyResponseSDKType;
    encode(_: MsgUpdateGroupPolicyDecisionPolicyResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupPolicyDecisionPolicyResponse;
    fromJSON(_: any): MsgUpdateGroupPolicyDecisionPolicyResponse;
    toJSON(_: MsgUpdateGroupPolicyDecisionPolicyResponse): JsonSafe<MsgUpdateGroupPolicyDecisionPolicyResponse>;
    fromPartial(_: Partial<MsgUpdateGroupPolicyDecisionPolicyResponse>): MsgUpdateGroupPolicyDecisionPolicyResponse;
    fromProtoMsg(message: MsgUpdateGroupPolicyDecisionPolicyResponseProtoMsg): MsgUpdateGroupPolicyDecisionPolicyResponse;
    toProto(message: MsgUpdateGroupPolicyDecisionPolicyResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupPolicyDecisionPolicyResponse): MsgUpdateGroupPolicyDecisionPolicyResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupPolicyMetadata is the Msg/UpdateGroupPolicyMetadata request type.
 * @name MsgUpdateGroupPolicyMetadata
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadata
 */
export declare const MsgUpdateGroupPolicyMetadata: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupPolicyMetadata";
    aminoType: "cosmos-sdk/MsgUpdateGroupPolicyMetadata";
    is(o: any): o is MsgUpdateGroupPolicyMetadata;
    isSDK(o: any): o is MsgUpdateGroupPolicyMetadataSDKType;
    encode(message: MsgUpdateGroupPolicyMetadata, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupPolicyMetadata;
    fromJSON(object: any): MsgUpdateGroupPolicyMetadata;
    toJSON(message: MsgUpdateGroupPolicyMetadata): JsonSafe<MsgUpdateGroupPolicyMetadata>;
    fromPartial(object: Partial<MsgUpdateGroupPolicyMetadata>): MsgUpdateGroupPolicyMetadata;
    fromProtoMsg(message: MsgUpdateGroupPolicyMetadataProtoMsg): MsgUpdateGroupPolicyMetadata;
    toProto(message: MsgUpdateGroupPolicyMetadata): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupPolicyMetadata): MsgUpdateGroupPolicyMetadataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateGroupPolicyMetadataResponse is the Msg/UpdateGroupPolicyMetadata response type.
 * @name MsgUpdateGroupPolicyMetadataResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse
 */
export declare const MsgUpdateGroupPolicyMetadataResponse: {
    typeUrl: "/cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse";
    aminoType: "cosmos-sdk/MsgUpdateGroupPolicyMetadataResponse";
    is(o: any): o is MsgUpdateGroupPolicyMetadataResponse;
    isSDK(o: any): o is MsgUpdateGroupPolicyMetadataResponseSDKType;
    encode(_: MsgUpdateGroupPolicyMetadataResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateGroupPolicyMetadataResponse;
    fromJSON(_: any): MsgUpdateGroupPolicyMetadataResponse;
    toJSON(_: MsgUpdateGroupPolicyMetadataResponse): JsonSafe<MsgUpdateGroupPolicyMetadataResponse>;
    fromPartial(_: Partial<MsgUpdateGroupPolicyMetadataResponse>): MsgUpdateGroupPolicyMetadataResponse;
    fromProtoMsg(message: MsgUpdateGroupPolicyMetadataResponseProtoMsg): MsgUpdateGroupPolicyMetadataResponse;
    toProto(message: MsgUpdateGroupPolicyMetadataResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateGroupPolicyMetadataResponse): MsgUpdateGroupPolicyMetadataResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSubmitProposal is the Msg/SubmitProposal request type.
 * @name MsgSubmitProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposal
 */
export declare const MsgSubmitProposal: {
    typeUrl: "/cosmos.group.v1.MsgSubmitProposal";
    aminoType: "cosmos-sdk/group/MsgSubmitProposal";
    is(o: any): o is MsgSubmitProposal;
    isSDK(o: any): o is MsgSubmitProposalSDKType;
    encode(message: MsgSubmitProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitProposal;
    fromJSON(object: any): MsgSubmitProposal;
    toJSON(message: MsgSubmitProposal): JsonSafe<MsgSubmitProposal>;
    fromPartial(object: Partial<MsgSubmitProposal>): MsgSubmitProposal;
    fromProtoMsg(message: MsgSubmitProposalProtoMsg): MsgSubmitProposal;
    toProto(message: MsgSubmitProposal): Uint8Array;
    toProtoMsg(message: MsgSubmitProposal): MsgSubmitProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSubmitProposalResponse is the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposalResponse
 */
export declare const MsgSubmitProposalResponse: {
    typeUrl: "/cosmos.group.v1.MsgSubmitProposalResponse";
    aminoType: "cosmos-sdk/MsgSubmitProposalResponse";
    is(o: any): o is MsgSubmitProposalResponse;
    isSDK(o: any): o is MsgSubmitProposalResponseSDKType;
    encode(message: MsgSubmitProposalResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitProposalResponse;
    fromJSON(object: any): MsgSubmitProposalResponse;
    toJSON(message: MsgSubmitProposalResponse): JsonSafe<MsgSubmitProposalResponse>;
    fromPartial(object: Partial<MsgSubmitProposalResponse>): MsgSubmitProposalResponse;
    fromProtoMsg(message: MsgSubmitProposalResponseProtoMsg): MsgSubmitProposalResponse;
    toProto(message: MsgSubmitProposalResponse): Uint8Array;
    toProtoMsg(message: MsgSubmitProposalResponse): MsgSubmitProposalResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWithdrawProposal is the Msg/WithdrawProposal request type.
 * @name MsgWithdrawProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposal
 */
export declare const MsgWithdrawProposal: {
    typeUrl: "/cosmos.group.v1.MsgWithdrawProposal";
    aminoType: "cosmos-sdk/group/MsgWithdrawProposal";
    is(o: any): o is MsgWithdrawProposal;
    isSDK(o: any): o is MsgWithdrawProposalSDKType;
    encode(message: MsgWithdrawProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawProposal;
    fromJSON(object: any): MsgWithdrawProposal;
    toJSON(message: MsgWithdrawProposal): JsonSafe<MsgWithdrawProposal>;
    fromPartial(object: Partial<MsgWithdrawProposal>): MsgWithdrawProposal;
    fromProtoMsg(message: MsgWithdrawProposalProtoMsg): MsgWithdrawProposal;
    toProto(message: MsgWithdrawProposal): Uint8Array;
    toProtoMsg(message: MsgWithdrawProposal): MsgWithdrawProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWithdrawProposalResponse is the Msg/WithdrawProposal response type.
 * @name MsgWithdrawProposalResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposalResponse
 */
export declare const MsgWithdrawProposalResponse: {
    typeUrl: "/cosmos.group.v1.MsgWithdrawProposalResponse";
    aminoType: "cosmos-sdk/MsgWithdrawProposalResponse";
    is(o: any): o is MsgWithdrawProposalResponse;
    isSDK(o: any): o is MsgWithdrawProposalResponseSDKType;
    encode(_: MsgWithdrawProposalResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawProposalResponse;
    fromJSON(_: any): MsgWithdrawProposalResponse;
    toJSON(_: MsgWithdrawProposalResponse): JsonSafe<MsgWithdrawProposalResponse>;
    fromPartial(_: Partial<MsgWithdrawProposalResponse>): MsgWithdrawProposalResponse;
    fromProtoMsg(message: MsgWithdrawProposalResponseProtoMsg): MsgWithdrawProposalResponse;
    toProto(message: MsgWithdrawProposalResponse): Uint8Array;
    toProtoMsg(message: MsgWithdrawProposalResponse): MsgWithdrawProposalResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgVote is the Msg/Vote request type.
 * @name MsgVote
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVote
 */
export declare const MsgVote: {
    typeUrl: "/cosmos.group.v1.MsgVote";
    aminoType: "cosmos-sdk/group/MsgVote";
    is(o: any): o is MsgVote;
    isSDK(o: any): o is MsgVoteSDKType;
    encode(message: MsgVote, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgVote;
    fromJSON(object: any): MsgVote;
    toJSON(message: MsgVote): JsonSafe<MsgVote>;
    fromPartial(object: Partial<MsgVote>): MsgVote;
    fromProtoMsg(message: MsgVoteProtoMsg): MsgVote;
    toProto(message: MsgVote): Uint8Array;
    toProtoMsg(message: MsgVote): MsgVoteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgVoteResponse is the Msg/Vote response type.
 * @name MsgVoteResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVoteResponse
 */
export declare const MsgVoteResponse: {
    typeUrl: "/cosmos.group.v1.MsgVoteResponse";
    aminoType: "cosmos-sdk/MsgVoteResponse";
    is(o: any): o is MsgVoteResponse;
    isSDK(o: any): o is MsgVoteResponseSDKType;
    encode(_: MsgVoteResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgVoteResponse;
    fromJSON(_: any): MsgVoteResponse;
    toJSON(_: MsgVoteResponse): JsonSafe<MsgVoteResponse>;
    fromPartial(_: Partial<MsgVoteResponse>): MsgVoteResponse;
    fromProtoMsg(message: MsgVoteResponseProtoMsg): MsgVoteResponse;
    toProto(message: MsgVoteResponse): Uint8Array;
    toProtoMsg(message: MsgVoteResponse): MsgVoteResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgExec is the Msg/Exec request type.
 * @name MsgExec
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExec
 */
export declare const MsgExec: {
    typeUrl: "/cosmos.group.v1.MsgExec";
    aminoType: "cosmos-sdk/group/MsgExec";
    is(o: any): o is MsgExec;
    isSDK(o: any): o is MsgExecSDKType;
    encode(message: MsgExec, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgExec;
    fromJSON(object: any): MsgExec;
    toJSON(message: MsgExec): JsonSafe<MsgExec>;
    fromPartial(object: Partial<MsgExec>): MsgExec;
    fromProtoMsg(message: MsgExecProtoMsg): MsgExec;
    toProto(message: MsgExec): Uint8Array;
    toProtoMsg(message: MsgExec): MsgExecProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgExecResponse is the Msg/Exec request type.
 * @name MsgExecResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExecResponse
 */
export declare const MsgExecResponse: {
    typeUrl: "/cosmos.group.v1.MsgExecResponse";
    aminoType: "cosmos-sdk/MsgExecResponse";
    is(o: any): o is MsgExecResponse;
    isSDK(o: any): o is MsgExecResponseSDKType;
    encode(message: MsgExecResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgExecResponse;
    fromJSON(object: any): MsgExecResponse;
    toJSON(message: MsgExecResponse): JsonSafe<MsgExecResponse>;
    fromPartial(object: Partial<MsgExecResponse>): MsgExecResponse;
    fromProtoMsg(message: MsgExecResponseProtoMsg): MsgExecResponse;
    toProto(message: MsgExecResponse): Uint8Array;
    toProtoMsg(message: MsgExecResponse): MsgExecResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgLeaveGroup is the Msg/LeaveGroup request type.
 * @name MsgLeaveGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroup
 */
export declare const MsgLeaveGroup: {
    typeUrl: "/cosmos.group.v1.MsgLeaveGroup";
    aminoType: "cosmos-sdk/group/MsgLeaveGroup";
    is(o: any): o is MsgLeaveGroup;
    isSDK(o: any): o is MsgLeaveGroupSDKType;
    encode(message: MsgLeaveGroup, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLeaveGroup;
    fromJSON(object: any): MsgLeaveGroup;
    toJSON(message: MsgLeaveGroup): JsonSafe<MsgLeaveGroup>;
    fromPartial(object: Partial<MsgLeaveGroup>): MsgLeaveGroup;
    fromProtoMsg(message: MsgLeaveGroupProtoMsg): MsgLeaveGroup;
    toProto(message: MsgLeaveGroup): Uint8Array;
    toProtoMsg(message: MsgLeaveGroup): MsgLeaveGroupProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgLeaveGroupResponse is the Msg/LeaveGroup response type.
 * @name MsgLeaveGroupResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroupResponse
 */
export declare const MsgLeaveGroupResponse: {
    typeUrl: "/cosmos.group.v1.MsgLeaveGroupResponse";
    aminoType: "cosmos-sdk/MsgLeaveGroupResponse";
    is(o: any): o is MsgLeaveGroupResponse;
    isSDK(o: any): o is MsgLeaveGroupResponseSDKType;
    encode(_: MsgLeaveGroupResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLeaveGroupResponse;
    fromJSON(_: any): MsgLeaveGroupResponse;
    toJSON(_: MsgLeaveGroupResponse): JsonSafe<MsgLeaveGroupResponse>;
    fromPartial(_: Partial<MsgLeaveGroupResponse>): MsgLeaveGroupResponse;
    fromProtoMsg(message: MsgLeaveGroupResponseProtoMsg): MsgLeaveGroupResponse;
    toProto(message: MsgLeaveGroupResponse): Uint8Array;
    toProtoMsg(message: MsgLeaveGroupResponse): MsgLeaveGroupResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map