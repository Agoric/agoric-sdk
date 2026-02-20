//@ts-nocheck
import {
  MemberRequest,
  type MemberRequestSDKType,
  VoteOption,
  ProposalExecutorResult,
  ThresholdDecisionPolicy,
  type ThresholdDecisionPolicySDKType,
  PercentageDecisionPolicy,
  type PercentageDecisionPolicySDKType,
  voteOptionFromJSON,
  voteOptionToJSON,
  proposalExecutorResultFromJSON,
  proposalExecutorResultToJSON,
} from './types.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { GlobalDecoderRegistry } from '../../../registry.js';
/** Exec defines modes of execution of a proposal on creation or on new vote. */
export enum Exec {
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
  UNRECOGNIZED = -1,
}
export const ExecSDKType = Exec;
export function execFromJSON(object: any): Exec {
  switch (object) {
    case 0:
    case 'EXEC_UNSPECIFIED':
      return Exec.EXEC_UNSPECIFIED;
    case 1:
    case 'EXEC_TRY':
      return Exec.EXEC_TRY;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return Exec.UNRECOGNIZED;
  }
}
export function execToJSON(object: Exec): string {
  switch (object) {
    case Exec.EXEC_UNSPECIFIED:
      return 'EXEC_UNSPECIFIED';
    case Exec.EXEC_TRY:
      return 'EXEC_TRY';
    case Exec.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
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
export interface MsgUpdateGroupMembersResponse {}
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
export interface MsgUpdateGroupMembersResponseSDKType {}
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
export interface MsgUpdateGroupAdminResponse {}
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
export interface MsgUpdateGroupAdminResponseSDKType {}
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
export interface MsgUpdateGroupMetadataResponse {}
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
export interface MsgUpdateGroupMetadataResponseSDKType {}
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
  decisionPolicy?:
    | (ThresholdDecisionPolicy & PercentageDecisionPolicy & Any)
    | undefined;
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
  decision_policy?:
    | ThresholdDecisionPolicySDKType
    | PercentageDecisionPolicySDKType
    | AnySDKType
    | undefined;
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
export interface MsgUpdateGroupPolicyAdminResponse {}
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
export interface MsgUpdateGroupPolicyAdminResponseSDKType {}
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
  decisionPolicy?:
    | (ThresholdDecisionPolicy & PercentageDecisionPolicy & Any)
    | undefined;
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
  decision_policy?:
    | ThresholdDecisionPolicySDKType
    | PercentageDecisionPolicySDKType
    | AnySDKType
    | undefined;
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
  decisionPolicy?:
    | (ThresholdDecisionPolicy & PercentageDecisionPolicy & Any)
    | undefined;
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
  decision_policy?:
    | ThresholdDecisionPolicySDKType
    | PercentageDecisionPolicySDKType
    | AnySDKType
    | undefined;
}
/**
 * MsgUpdateGroupPolicyDecisionPolicyResponse is the Msg/UpdateGroupPolicyDecisionPolicy response type.
 * @name MsgUpdateGroupPolicyDecisionPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse
 */
export interface MsgUpdateGroupPolicyDecisionPolicyResponse {}
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
export interface MsgUpdateGroupPolicyDecisionPolicyResponseSDKType {}
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
export interface MsgUpdateGroupPolicyMetadataResponse {}
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
export interface MsgUpdateGroupPolicyMetadataResponseSDKType {}
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
export interface MsgWithdrawProposalResponse {}
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
export interface MsgWithdrawProposalResponseSDKType {}
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
export interface MsgVoteResponse {}
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
export interface MsgVoteResponseSDKType {}
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
export interface MsgLeaveGroupResponse {}
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
export interface MsgLeaveGroupResponseSDKType {}
function createBaseMsgCreateGroup(): MsgCreateGroup {
  return {
    admin: '',
    members: [],
    metadata: '',
  };
}
/**
 * MsgCreateGroup is the Msg/CreateGroup request type.
 * @name MsgCreateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroup
 */
export const MsgCreateGroup = {
  typeUrl: '/cosmos.group.v1.MsgCreateGroup' as const,
  aminoType: 'cosmos-sdk/MsgCreateGroup' as const,
  is(o: any): o is MsgCreateGroup {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroup.typeUrl ||
        (typeof o.admin === 'string' &&
          Array.isArray(o.members) &&
          (!o.members.length || MemberRequest.is(o.members[0])) &&
          typeof o.metadata === 'string'))
    );
  },
  isSDK(o: any): o is MsgCreateGroupSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroup.typeUrl ||
        (typeof o.admin === 'string' &&
          Array.isArray(o.members) &&
          (!o.members.length || MemberRequest.isSDK(o.members[0])) &&
          typeof o.metadata === 'string'))
    );
  },
  encode(
    message: MsgCreateGroup,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    for (const v of message.members) {
      MemberRequest.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.metadata !== '') {
      writer.uint32(26).string(message.metadata);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateGroup {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateGroup();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.members.push(MemberRequest.decode(reader, reader.uint32()));
          break;
        case 3:
          message.metadata = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateGroup {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      members: Array.isArray(object?.members)
        ? object.members.map((e: any) => MemberRequest.fromJSON(e))
        : [],
      metadata: isSet(object.metadata) ? String(object.metadata) : '',
    };
  },
  toJSON(message: MsgCreateGroup): JsonSafe<MsgCreateGroup> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    if (message.members) {
      obj.members = message.members.map(e =>
        e ? MemberRequest.toJSON(e) : undefined,
      );
    } else {
      obj.members = [];
    }
    message.metadata !== undefined && (obj.metadata = message.metadata);
    return obj;
  },
  fromPartial(object: Partial<MsgCreateGroup>): MsgCreateGroup {
    const message = createBaseMsgCreateGroup();
    message.admin = object.admin ?? '';
    message.members =
      object.members?.map(e => MemberRequest.fromPartial(e)) || [];
    message.metadata = object.metadata ?? '';
    return message;
  },
  fromProtoMsg(message: MsgCreateGroupProtoMsg): MsgCreateGroup {
    return MsgCreateGroup.decode(message.value);
  },
  toProto(message: MsgCreateGroup): Uint8Array {
    return MsgCreateGroup.encode(message).finish();
  },
  toProtoMsg(message: MsgCreateGroup): MsgCreateGroupProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgCreateGroup',
      value: MsgCreateGroup.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateGroupResponse(): MsgCreateGroupResponse {
  return {
    groupId: BigInt(0),
  };
}
/**
 * MsgCreateGroupResponse is the Msg/CreateGroup response type.
 * @name MsgCreateGroupResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupResponse
 */
export const MsgCreateGroupResponse = {
  typeUrl: '/cosmos.group.v1.MsgCreateGroupResponse' as const,
  aminoType: 'cosmos-sdk/MsgCreateGroupResponse' as const,
  is(o: any): o is MsgCreateGroupResponse {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupResponse.typeUrl ||
        typeof o.groupId === 'bigint')
    );
  },
  isSDK(o: any): o is MsgCreateGroupResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupResponse.typeUrl ||
        typeof o.group_id === 'bigint')
    );
  },
  encode(
    message: MsgCreateGroupResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateGroupResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateGroupResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateGroupResponse {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgCreateGroupResponse): JsonSafe<MsgCreateGroupResponse> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgCreateGroupResponse>): MsgCreateGroupResponse {
    const message = createBaseMsgCreateGroupResponse();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgCreateGroupResponseProtoMsg,
  ): MsgCreateGroupResponse {
    return MsgCreateGroupResponse.decode(message.value);
  },
  toProto(message: MsgCreateGroupResponse): Uint8Array {
    return MsgCreateGroupResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgCreateGroupResponse): MsgCreateGroupResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgCreateGroupResponse',
      value: MsgCreateGroupResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupMembers(): MsgUpdateGroupMembers {
  return {
    admin: '',
    groupId: BigInt(0),
    memberUpdates: [],
  };
}
/**
 * MsgUpdateGroupMembers is the Msg/UpdateGroupMembers request type.
 * @name MsgUpdateGroupMembers
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembers
 */
export const MsgUpdateGroupMembers = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupMembers' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupMembers' as const,
  is(o: any): o is MsgUpdateGroupMembers {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupMembers.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupId === 'bigint' &&
          Array.isArray(o.memberUpdates) &&
          (!o.memberUpdates.length || MemberRequest.is(o.memberUpdates[0]))))
    );
  },
  isSDK(o: any): o is MsgUpdateGroupMembersSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupMembers.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_id === 'bigint' &&
          Array.isArray(o.member_updates) &&
          (!o.member_updates.length ||
            MemberRequest.isSDK(o.member_updates[0]))))
    );
  },
  encode(
    message: MsgUpdateGroupMembers,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupId !== BigInt(0)) {
      writer.uint32(16).uint64(message.groupId);
    }
    for (const v of message.memberUpdates) {
      MemberRequest.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupMembers {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupMembers();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupId = reader.uint64();
          break;
        case 3:
          message.memberUpdates.push(
            MemberRequest.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateGroupMembers {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      memberUpdates: Array.isArray(object?.memberUpdates)
        ? object.memberUpdates.map((e: any) => MemberRequest.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgUpdateGroupMembers): JsonSafe<MsgUpdateGroupMembers> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    if (message.memberUpdates) {
      obj.memberUpdates = message.memberUpdates.map(e =>
        e ? MemberRequest.toJSON(e) : undefined,
      );
    } else {
      obj.memberUpdates = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateGroupMembers>): MsgUpdateGroupMembers {
    const message = createBaseMsgUpdateGroupMembers();
    message.admin = object.admin ?? '';
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.memberUpdates =
      object.memberUpdates?.map(e => MemberRequest.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgUpdateGroupMembersProtoMsg): MsgUpdateGroupMembers {
    return MsgUpdateGroupMembers.decode(message.value);
  },
  toProto(message: MsgUpdateGroupMembers): Uint8Array {
    return MsgUpdateGroupMembers.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateGroupMembers): MsgUpdateGroupMembersProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupMembers',
      value: MsgUpdateGroupMembers.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupMembersResponse(): MsgUpdateGroupMembersResponse {
  return {};
}
/**
 * MsgUpdateGroupMembersResponse is the Msg/UpdateGroupMembers response type.
 * @name MsgUpdateGroupMembersResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMembersResponse
 */
export const MsgUpdateGroupMembersResponse = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupMembersResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupMembersResponse' as const,
  is(o: any): o is MsgUpdateGroupMembersResponse {
    return o && o.$typeUrl === MsgUpdateGroupMembersResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateGroupMembersResponseSDKType {
    return o && o.$typeUrl === MsgUpdateGroupMembersResponse.typeUrl;
  },
  encode(
    _: MsgUpdateGroupMembersResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupMembersResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupMembersResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateGroupMembersResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateGroupMembersResponse,
  ): JsonSafe<MsgUpdateGroupMembersResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateGroupMembersResponse>,
  ): MsgUpdateGroupMembersResponse {
    const message = createBaseMsgUpdateGroupMembersResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupMembersResponseProtoMsg,
  ): MsgUpdateGroupMembersResponse {
    return MsgUpdateGroupMembersResponse.decode(message.value);
  },
  toProto(message: MsgUpdateGroupMembersResponse): Uint8Array {
    return MsgUpdateGroupMembersResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupMembersResponse,
  ): MsgUpdateGroupMembersResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupMembersResponse',
      value: MsgUpdateGroupMembersResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupAdmin(): MsgUpdateGroupAdmin {
  return {
    admin: '',
    groupId: BigInt(0),
    newAdmin: '',
  };
}
/**
 * MsgUpdateGroupAdmin is the Msg/UpdateGroupAdmin request type.
 * @name MsgUpdateGroupAdmin
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdmin
 */
export const MsgUpdateGroupAdmin = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupAdmin' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupAdmin' as const,
  is(o: any): o is MsgUpdateGroupAdmin {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupAdmin.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupId === 'bigint' &&
          typeof o.newAdmin === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateGroupAdminSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupAdmin.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_id === 'bigint' &&
          typeof o.new_admin === 'string'))
    );
  },
  encode(
    message: MsgUpdateGroupAdmin,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupId !== BigInt(0)) {
      writer.uint32(16).uint64(message.groupId);
    }
    if (message.newAdmin !== '') {
      writer.uint32(26).string(message.newAdmin);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupAdmin {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupAdmin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupId = reader.uint64();
          break;
        case 3:
          message.newAdmin = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateGroupAdmin {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      newAdmin: isSet(object.newAdmin) ? String(object.newAdmin) : '',
    };
  },
  toJSON(message: MsgUpdateGroupAdmin): JsonSafe<MsgUpdateGroupAdmin> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.newAdmin !== undefined && (obj.newAdmin = message.newAdmin);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateGroupAdmin>): MsgUpdateGroupAdmin {
    const message = createBaseMsgUpdateGroupAdmin();
    message.admin = object.admin ?? '';
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.newAdmin = object.newAdmin ?? '';
    return message;
  },
  fromProtoMsg(message: MsgUpdateGroupAdminProtoMsg): MsgUpdateGroupAdmin {
    return MsgUpdateGroupAdmin.decode(message.value);
  },
  toProto(message: MsgUpdateGroupAdmin): Uint8Array {
    return MsgUpdateGroupAdmin.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateGroupAdmin): MsgUpdateGroupAdminProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupAdmin',
      value: MsgUpdateGroupAdmin.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupAdminResponse(): MsgUpdateGroupAdminResponse {
  return {};
}
/**
 * MsgUpdateGroupAdminResponse is the Msg/UpdateGroupAdmin response type.
 * @name MsgUpdateGroupAdminResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupAdminResponse
 */
export const MsgUpdateGroupAdminResponse = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupAdminResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupAdminResponse' as const,
  is(o: any): o is MsgUpdateGroupAdminResponse {
    return o && o.$typeUrl === MsgUpdateGroupAdminResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateGroupAdminResponseSDKType {
    return o && o.$typeUrl === MsgUpdateGroupAdminResponse.typeUrl;
  },
  encode(
    _: MsgUpdateGroupAdminResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupAdminResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupAdminResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateGroupAdminResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateGroupAdminResponse,
  ): JsonSafe<MsgUpdateGroupAdminResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateGroupAdminResponse>,
  ): MsgUpdateGroupAdminResponse {
    const message = createBaseMsgUpdateGroupAdminResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupAdminResponseProtoMsg,
  ): MsgUpdateGroupAdminResponse {
    return MsgUpdateGroupAdminResponse.decode(message.value);
  },
  toProto(message: MsgUpdateGroupAdminResponse): Uint8Array {
    return MsgUpdateGroupAdminResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupAdminResponse,
  ): MsgUpdateGroupAdminResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupAdminResponse',
      value: MsgUpdateGroupAdminResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupMetadata(): MsgUpdateGroupMetadata {
  return {
    admin: '',
    groupId: BigInt(0),
    metadata: '',
  };
}
/**
 * MsgUpdateGroupMetadata is the Msg/UpdateGroupMetadata request type.
 * @name MsgUpdateGroupMetadata
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadata
 */
export const MsgUpdateGroupMetadata = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupMetadata' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupMetadata' as const,
  is(o: any): o is MsgUpdateGroupMetadata {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupMetadata.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupId === 'bigint' &&
          typeof o.metadata === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateGroupMetadataSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupMetadata.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_id === 'bigint' &&
          typeof o.metadata === 'string'))
    );
  },
  encode(
    message: MsgUpdateGroupMetadata,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupId !== BigInt(0)) {
      writer.uint32(16).uint64(message.groupId);
    }
    if (message.metadata !== '') {
      writer.uint32(26).string(message.metadata);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupMetadata {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupMetadata();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupId = reader.uint64();
          break;
        case 3:
          message.metadata = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateGroupMetadata {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      metadata: isSet(object.metadata) ? String(object.metadata) : '',
    };
  },
  toJSON(message: MsgUpdateGroupMetadata): JsonSafe<MsgUpdateGroupMetadata> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.metadata !== undefined && (obj.metadata = message.metadata);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateGroupMetadata>): MsgUpdateGroupMetadata {
    const message = createBaseMsgUpdateGroupMetadata();
    message.admin = object.admin ?? '';
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.metadata = object.metadata ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupMetadataProtoMsg,
  ): MsgUpdateGroupMetadata {
    return MsgUpdateGroupMetadata.decode(message.value);
  },
  toProto(message: MsgUpdateGroupMetadata): Uint8Array {
    return MsgUpdateGroupMetadata.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateGroupMetadata): MsgUpdateGroupMetadataProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupMetadata',
      value: MsgUpdateGroupMetadata.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupMetadataResponse(): MsgUpdateGroupMetadataResponse {
  return {};
}
/**
 * MsgUpdateGroupMetadataResponse is the Msg/UpdateGroupMetadata response type.
 * @name MsgUpdateGroupMetadataResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupMetadataResponse
 */
export const MsgUpdateGroupMetadataResponse = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupMetadataResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupMetadataResponse' as const,
  is(o: any): o is MsgUpdateGroupMetadataResponse {
    return o && o.$typeUrl === MsgUpdateGroupMetadataResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateGroupMetadataResponseSDKType {
    return o && o.$typeUrl === MsgUpdateGroupMetadataResponse.typeUrl;
  },
  encode(
    _: MsgUpdateGroupMetadataResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupMetadataResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupMetadataResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateGroupMetadataResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateGroupMetadataResponse,
  ): JsonSafe<MsgUpdateGroupMetadataResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateGroupMetadataResponse>,
  ): MsgUpdateGroupMetadataResponse {
    const message = createBaseMsgUpdateGroupMetadataResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupMetadataResponseProtoMsg,
  ): MsgUpdateGroupMetadataResponse {
    return MsgUpdateGroupMetadataResponse.decode(message.value);
  },
  toProto(message: MsgUpdateGroupMetadataResponse): Uint8Array {
    return MsgUpdateGroupMetadataResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupMetadataResponse,
  ): MsgUpdateGroupMetadataResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupMetadataResponse',
      value: MsgUpdateGroupMetadataResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateGroupPolicy(): MsgCreateGroupPolicy {
  return {
    admin: '',
    groupId: BigInt(0),
    metadata: '',
    decisionPolicy: undefined,
  };
}
/**
 * MsgCreateGroupPolicy is the Msg/CreateGroupPolicy request type.
 * @name MsgCreateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicy
 */
export const MsgCreateGroupPolicy = {
  typeUrl: '/cosmos.group.v1.MsgCreateGroupPolicy' as const,
  aminoType: 'cosmos-sdk/MsgCreateGroupPolicy' as const,
  is(o: any): o is MsgCreateGroupPolicy {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupPolicy.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupId === 'bigint' &&
          typeof o.metadata === 'string'))
    );
  },
  isSDK(o: any): o is MsgCreateGroupPolicySDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupPolicy.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_id === 'bigint' &&
          typeof o.metadata === 'string'))
    );
  },
  encode(
    message: MsgCreateGroupPolicy,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupId !== BigInt(0)) {
      writer.uint32(16).uint64(message.groupId);
    }
    if (message.metadata !== '') {
      writer.uint32(26).string(message.metadata);
    }
    if (message.decisionPolicy !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.decisionPolicy),
        writer.uint32(34).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateGroupPolicy {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateGroupPolicy();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupId = reader.uint64();
          break;
        case 3:
          message.metadata = reader.string();
          break;
        case 4:
          message.decisionPolicy = GlobalDecoderRegistry.unwrapAny(reader);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateGroupPolicy {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      metadata: isSet(object.metadata) ? String(object.metadata) : '',
      decisionPolicy: isSet(object.decisionPolicy)
        ? GlobalDecoderRegistry.fromJSON(object.decisionPolicy)
        : undefined,
    };
  },
  toJSON(message: MsgCreateGroupPolicy): JsonSafe<MsgCreateGroupPolicy> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.metadata !== undefined && (obj.metadata = message.metadata);
    message.decisionPolicy !== undefined &&
      (obj.decisionPolicy = message.decisionPolicy
        ? GlobalDecoderRegistry.toJSON(message.decisionPolicy)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgCreateGroupPolicy>): MsgCreateGroupPolicy {
    const message = createBaseMsgCreateGroupPolicy();
    message.admin = object.admin ?? '';
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.metadata = object.metadata ?? '';
    message.decisionPolicy =
      object.decisionPolicy !== undefined && object.decisionPolicy !== null
        ? GlobalDecoderRegistry.fromPartial(object.decisionPolicy)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgCreateGroupPolicyProtoMsg): MsgCreateGroupPolicy {
    return MsgCreateGroupPolicy.decode(message.value);
  },
  toProto(message: MsgCreateGroupPolicy): Uint8Array {
    return MsgCreateGroupPolicy.encode(message).finish();
  },
  toProtoMsg(message: MsgCreateGroupPolicy): MsgCreateGroupPolicyProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgCreateGroupPolicy',
      value: MsgCreateGroupPolicy.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateGroupPolicyResponse(): MsgCreateGroupPolicyResponse {
  return {
    address: '',
  };
}
/**
 * MsgCreateGroupPolicyResponse is the Msg/CreateGroupPolicy response type.
 * @name MsgCreateGroupPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupPolicyResponse
 */
export const MsgCreateGroupPolicyResponse = {
  typeUrl: '/cosmos.group.v1.MsgCreateGroupPolicyResponse' as const,
  aminoType: 'cosmos-sdk/MsgCreateGroupPolicyResponse' as const,
  is(o: any): o is MsgCreateGroupPolicyResponse {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupPolicyResponse.typeUrl ||
        typeof o.address === 'string')
    );
  },
  isSDK(o: any): o is MsgCreateGroupPolicyResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupPolicyResponse.typeUrl ||
        typeof o.address === 'string')
    );
  },
  encode(
    message: MsgCreateGroupPolicyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateGroupPolicyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateGroupPolicyResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateGroupPolicyResponse {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(
    message: MsgCreateGroupPolicyResponse,
  ): JsonSafe<MsgCreateGroupPolicyResponse> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(
    object: Partial<MsgCreateGroupPolicyResponse>,
  ): MsgCreateGroupPolicyResponse {
    const message = createBaseMsgCreateGroupPolicyResponse();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgCreateGroupPolicyResponseProtoMsg,
  ): MsgCreateGroupPolicyResponse {
    return MsgCreateGroupPolicyResponse.decode(message.value);
  },
  toProto(message: MsgCreateGroupPolicyResponse): Uint8Array {
    return MsgCreateGroupPolicyResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateGroupPolicyResponse,
  ): MsgCreateGroupPolicyResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgCreateGroupPolicyResponse',
      value: MsgCreateGroupPolicyResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupPolicyAdmin(): MsgUpdateGroupPolicyAdmin {
  return {
    admin: '',
    groupPolicyAddress: '',
    newAdmin: '',
  };
}
/**
 * MsgUpdateGroupPolicyAdmin is the Msg/UpdateGroupPolicyAdmin request type.
 * @name MsgUpdateGroupPolicyAdmin
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdmin
 */
export const MsgUpdateGroupPolicyAdmin = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyAdmin' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupPolicyAdmin' as const,
  is(o: any): o is MsgUpdateGroupPolicyAdmin {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupPolicyAdmin.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupPolicyAddress === 'string' &&
          typeof o.newAdmin === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateGroupPolicyAdminSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupPolicyAdmin.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_policy_address === 'string' &&
          typeof o.new_admin === 'string'))
    );
  },
  encode(
    message: MsgUpdateGroupPolicyAdmin,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupPolicyAddress !== '') {
      writer.uint32(18).string(message.groupPolicyAddress);
    }
    if (message.newAdmin !== '') {
      writer.uint32(26).string(message.newAdmin);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupPolicyAdmin {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupPolicyAdmin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupPolicyAddress = reader.string();
          break;
        case 3:
          message.newAdmin = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateGroupPolicyAdmin {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupPolicyAddress: isSet(object.groupPolicyAddress)
        ? String(object.groupPolicyAddress)
        : '',
      newAdmin: isSet(object.newAdmin) ? String(object.newAdmin) : '',
    };
  },
  toJSON(
    message: MsgUpdateGroupPolicyAdmin,
  ): JsonSafe<MsgUpdateGroupPolicyAdmin> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupPolicyAddress !== undefined &&
      (obj.groupPolicyAddress = message.groupPolicyAddress);
    message.newAdmin !== undefined && (obj.newAdmin = message.newAdmin);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateGroupPolicyAdmin>,
  ): MsgUpdateGroupPolicyAdmin {
    const message = createBaseMsgUpdateGroupPolicyAdmin();
    message.admin = object.admin ?? '';
    message.groupPolicyAddress = object.groupPolicyAddress ?? '';
    message.newAdmin = object.newAdmin ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupPolicyAdminProtoMsg,
  ): MsgUpdateGroupPolicyAdmin {
    return MsgUpdateGroupPolicyAdmin.decode(message.value);
  },
  toProto(message: MsgUpdateGroupPolicyAdmin): Uint8Array {
    return MsgUpdateGroupPolicyAdmin.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupPolicyAdmin,
  ): MsgUpdateGroupPolicyAdminProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyAdmin',
      value: MsgUpdateGroupPolicyAdmin.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupPolicyAdminResponse(): MsgUpdateGroupPolicyAdminResponse {
  return {};
}
/**
 * MsgUpdateGroupPolicyAdminResponse is the Msg/UpdateGroupPolicyAdmin response type.
 * @name MsgUpdateGroupPolicyAdminResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse
 */
export const MsgUpdateGroupPolicyAdminResponse = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupPolicyAdminResponse' as const,
  is(o: any): o is MsgUpdateGroupPolicyAdminResponse {
    return o && o.$typeUrl === MsgUpdateGroupPolicyAdminResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateGroupPolicyAdminResponseSDKType {
    return o && o.$typeUrl === MsgUpdateGroupPolicyAdminResponse.typeUrl;
  },
  encode(
    _: MsgUpdateGroupPolicyAdminResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupPolicyAdminResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupPolicyAdminResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateGroupPolicyAdminResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateGroupPolicyAdminResponse,
  ): JsonSafe<MsgUpdateGroupPolicyAdminResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateGroupPolicyAdminResponse>,
  ): MsgUpdateGroupPolicyAdminResponse {
    const message = createBaseMsgUpdateGroupPolicyAdminResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupPolicyAdminResponseProtoMsg,
  ): MsgUpdateGroupPolicyAdminResponse {
    return MsgUpdateGroupPolicyAdminResponse.decode(message.value);
  },
  toProto(message: MsgUpdateGroupPolicyAdminResponse): Uint8Array {
    return MsgUpdateGroupPolicyAdminResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupPolicyAdminResponse,
  ): MsgUpdateGroupPolicyAdminResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyAdminResponse',
      value: MsgUpdateGroupPolicyAdminResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateGroupWithPolicy(): MsgCreateGroupWithPolicy {
  return {
    admin: '',
    members: [],
    groupMetadata: '',
    groupPolicyMetadata: '',
    groupPolicyAsAdmin: false,
    decisionPolicy: undefined,
  };
}
/**
 * MsgCreateGroupWithPolicy is the Msg/CreateGroupWithPolicy request type.
 * @name MsgCreateGroupWithPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicy
 */
export const MsgCreateGroupWithPolicy = {
  typeUrl: '/cosmos.group.v1.MsgCreateGroupWithPolicy' as const,
  aminoType: 'cosmos-sdk/MsgCreateGroupWithPolicy' as const,
  is(o: any): o is MsgCreateGroupWithPolicy {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupWithPolicy.typeUrl ||
        (typeof o.admin === 'string' &&
          Array.isArray(o.members) &&
          (!o.members.length || MemberRequest.is(o.members[0])) &&
          typeof o.groupMetadata === 'string' &&
          typeof o.groupPolicyMetadata === 'string' &&
          typeof o.groupPolicyAsAdmin === 'boolean'))
    );
  },
  isSDK(o: any): o is MsgCreateGroupWithPolicySDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupWithPolicy.typeUrl ||
        (typeof o.admin === 'string' &&
          Array.isArray(o.members) &&
          (!o.members.length || MemberRequest.isSDK(o.members[0])) &&
          typeof o.group_metadata === 'string' &&
          typeof o.group_policy_metadata === 'string' &&
          typeof o.group_policy_as_admin === 'boolean'))
    );
  },
  encode(
    message: MsgCreateGroupWithPolicy,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    for (const v of message.members) {
      MemberRequest.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.groupMetadata !== '') {
      writer.uint32(26).string(message.groupMetadata);
    }
    if (message.groupPolicyMetadata !== '') {
      writer.uint32(34).string(message.groupPolicyMetadata);
    }
    if (message.groupPolicyAsAdmin === true) {
      writer.uint32(40).bool(message.groupPolicyAsAdmin);
    }
    if (message.decisionPolicy !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.decisionPolicy),
        writer.uint32(50).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateGroupWithPolicy {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateGroupWithPolicy();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.members.push(MemberRequest.decode(reader, reader.uint32()));
          break;
        case 3:
          message.groupMetadata = reader.string();
          break;
        case 4:
          message.groupPolicyMetadata = reader.string();
          break;
        case 5:
          message.groupPolicyAsAdmin = reader.bool();
          break;
        case 6:
          message.decisionPolicy = GlobalDecoderRegistry.unwrapAny(reader);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateGroupWithPolicy {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      members: Array.isArray(object?.members)
        ? object.members.map((e: any) => MemberRequest.fromJSON(e))
        : [],
      groupMetadata: isSet(object.groupMetadata)
        ? String(object.groupMetadata)
        : '',
      groupPolicyMetadata: isSet(object.groupPolicyMetadata)
        ? String(object.groupPolicyMetadata)
        : '',
      groupPolicyAsAdmin: isSet(object.groupPolicyAsAdmin)
        ? Boolean(object.groupPolicyAsAdmin)
        : false,
      decisionPolicy: isSet(object.decisionPolicy)
        ? GlobalDecoderRegistry.fromJSON(object.decisionPolicy)
        : undefined,
    };
  },
  toJSON(
    message: MsgCreateGroupWithPolicy,
  ): JsonSafe<MsgCreateGroupWithPolicy> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    if (message.members) {
      obj.members = message.members.map(e =>
        e ? MemberRequest.toJSON(e) : undefined,
      );
    } else {
      obj.members = [];
    }
    message.groupMetadata !== undefined &&
      (obj.groupMetadata = message.groupMetadata);
    message.groupPolicyMetadata !== undefined &&
      (obj.groupPolicyMetadata = message.groupPolicyMetadata);
    message.groupPolicyAsAdmin !== undefined &&
      (obj.groupPolicyAsAdmin = message.groupPolicyAsAdmin);
    message.decisionPolicy !== undefined &&
      (obj.decisionPolicy = message.decisionPolicy
        ? GlobalDecoderRegistry.toJSON(message.decisionPolicy)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<MsgCreateGroupWithPolicy>,
  ): MsgCreateGroupWithPolicy {
    const message = createBaseMsgCreateGroupWithPolicy();
    message.admin = object.admin ?? '';
    message.members =
      object.members?.map(e => MemberRequest.fromPartial(e)) || [];
    message.groupMetadata = object.groupMetadata ?? '';
    message.groupPolicyMetadata = object.groupPolicyMetadata ?? '';
    message.groupPolicyAsAdmin = object.groupPolicyAsAdmin ?? false;
    message.decisionPolicy =
      object.decisionPolicy !== undefined && object.decisionPolicy !== null
        ? GlobalDecoderRegistry.fromPartial(object.decisionPolicy)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgCreateGroupWithPolicyProtoMsg,
  ): MsgCreateGroupWithPolicy {
    return MsgCreateGroupWithPolicy.decode(message.value);
  },
  toProto(message: MsgCreateGroupWithPolicy): Uint8Array {
    return MsgCreateGroupWithPolicy.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateGroupWithPolicy,
  ): MsgCreateGroupWithPolicyProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgCreateGroupWithPolicy',
      value: MsgCreateGroupWithPolicy.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateGroupWithPolicyResponse(): MsgCreateGroupWithPolicyResponse {
  return {
    groupId: BigInt(0),
    groupPolicyAddress: '',
  };
}
/**
 * MsgCreateGroupWithPolicyResponse is the Msg/CreateGroupWithPolicy response type.
 * @name MsgCreateGroupWithPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgCreateGroupWithPolicyResponse
 */
export const MsgCreateGroupWithPolicyResponse = {
  typeUrl: '/cosmos.group.v1.MsgCreateGroupWithPolicyResponse' as const,
  aminoType: 'cosmos-sdk/MsgCreateGroupWithPolicyResponse' as const,
  is(o: any): o is MsgCreateGroupWithPolicyResponse {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupWithPolicyResponse.typeUrl ||
        (typeof o.groupId === 'bigint' &&
          typeof o.groupPolicyAddress === 'string'))
    );
  },
  isSDK(o: any): o is MsgCreateGroupWithPolicyResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateGroupWithPolicyResponse.typeUrl ||
        (typeof o.group_id === 'bigint' &&
          typeof o.group_policy_address === 'string'))
    );
  },
  encode(
    message: MsgCreateGroupWithPolicyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    if (message.groupPolicyAddress !== '') {
      writer.uint32(18).string(message.groupPolicyAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateGroupWithPolicyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateGroupWithPolicyResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupId = reader.uint64();
          break;
        case 2:
          message.groupPolicyAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateGroupWithPolicyResponse {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      groupPolicyAddress: isSet(object.groupPolicyAddress)
        ? String(object.groupPolicyAddress)
        : '',
    };
  },
  toJSON(
    message: MsgCreateGroupWithPolicyResponse,
  ): JsonSafe<MsgCreateGroupWithPolicyResponse> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.groupPolicyAddress !== undefined &&
      (obj.groupPolicyAddress = message.groupPolicyAddress);
    return obj;
  },
  fromPartial(
    object: Partial<MsgCreateGroupWithPolicyResponse>,
  ): MsgCreateGroupWithPolicyResponse {
    const message = createBaseMsgCreateGroupWithPolicyResponse();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.groupPolicyAddress = object.groupPolicyAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgCreateGroupWithPolicyResponseProtoMsg,
  ): MsgCreateGroupWithPolicyResponse {
    return MsgCreateGroupWithPolicyResponse.decode(message.value);
  },
  toProto(message: MsgCreateGroupWithPolicyResponse): Uint8Array {
    return MsgCreateGroupWithPolicyResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateGroupWithPolicyResponse,
  ): MsgCreateGroupWithPolicyResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgCreateGroupWithPolicyResponse',
      value: MsgCreateGroupWithPolicyResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupPolicyDecisionPolicy(): MsgUpdateGroupPolicyDecisionPolicy {
  return {
    admin: '',
    groupPolicyAddress: '',
    decisionPolicy: undefined,
  };
}
/**
 * MsgUpdateGroupPolicyDecisionPolicy is the Msg/UpdateGroupPolicyDecisionPolicy request type.
 * @name MsgUpdateGroupPolicyDecisionPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy
 */
export const MsgUpdateGroupPolicyDecisionPolicy = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupDecisionPolicy' as const,
  is(o: any): o is MsgUpdateGroupPolicyDecisionPolicy {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupPolicyDecisionPolicy.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupPolicyAddress === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateGroupPolicyDecisionPolicySDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupPolicyDecisionPolicy.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_policy_address === 'string'))
    );
  },
  encode(
    message: MsgUpdateGroupPolicyDecisionPolicy,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupPolicyAddress !== '') {
      writer.uint32(18).string(message.groupPolicyAddress);
    }
    if (message.decisionPolicy !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.decisionPolicy),
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupPolicyDecisionPolicy {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupPolicyDecisionPolicy();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupPolicyAddress = reader.string();
          break;
        case 3:
          message.decisionPolicy = GlobalDecoderRegistry.unwrapAny(reader);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateGroupPolicyDecisionPolicy {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupPolicyAddress: isSet(object.groupPolicyAddress)
        ? String(object.groupPolicyAddress)
        : '',
      decisionPolicy: isSet(object.decisionPolicy)
        ? GlobalDecoderRegistry.fromJSON(object.decisionPolicy)
        : undefined,
    };
  },
  toJSON(
    message: MsgUpdateGroupPolicyDecisionPolicy,
  ): JsonSafe<MsgUpdateGroupPolicyDecisionPolicy> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupPolicyAddress !== undefined &&
      (obj.groupPolicyAddress = message.groupPolicyAddress);
    message.decisionPolicy !== undefined &&
      (obj.decisionPolicy = message.decisionPolicy
        ? GlobalDecoderRegistry.toJSON(message.decisionPolicy)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateGroupPolicyDecisionPolicy>,
  ): MsgUpdateGroupPolicyDecisionPolicy {
    const message = createBaseMsgUpdateGroupPolicyDecisionPolicy();
    message.admin = object.admin ?? '';
    message.groupPolicyAddress = object.groupPolicyAddress ?? '';
    message.decisionPolicy =
      object.decisionPolicy !== undefined && object.decisionPolicy !== null
        ? GlobalDecoderRegistry.fromPartial(object.decisionPolicy)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupPolicyDecisionPolicyProtoMsg,
  ): MsgUpdateGroupPolicyDecisionPolicy {
    return MsgUpdateGroupPolicyDecisionPolicy.decode(message.value);
  },
  toProto(message: MsgUpdateGroupPolicyDecisionPolicy): Uint8Array {
    return MsgUpdateGroupPolicyDecisionPolicy.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupPolicyDecisionPolicy,
  ): MsgUpdateGroupPolicyDecisionPolicyProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicy',
      value: MsgUpdateGroupPolicyDecisionPolicy.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupPolicyDecisionPolicyResponse(): MsgUpdateGroupPolicyDecisionPolicyResponse {
  return {};
}
/**
 * MsgUpdateGroupPolicyDecisionPolicyResponse is the Msg/UpdateGroupPolicyDecisionPolicy response type.
 * @name MsgUpdateGroupPolicyDecisionPolicyResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse
 */
export const MsgUpdateGroupPolicyDecisionPolicyResponse = {
  typeUrl:
    '/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupPolicyDecisionPolicyResponse' as const,
  is(o: any): o is MsgUpdateGroupPolicyDecisionPolicyResponse {
    return (
      o && o.$typeUrl === MsgUpdateGroupPolicyDecisionPolicyResponse.typeUrl
    );
  },
  isSDK(o: any): o is MsgUpdateGroupPolicyDecisionPolicyResponseSDKType {
    return (
      o && o.$typeUrl === MsgUpdateGroupPolicyDecisionPolicyResponse.typeUrl
    );
  },
  encode(
    _: MsgUpdateGroupPolicyDecisionPolicyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupPolicyDecisionPolicyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupPolicyDecisionPolicyResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateGroupPolicyDecisionPolicyResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateGroupPolicyDecisionPolicyResponse,
  ): JsonSafe<MsgUpdateGroupPolicyDecisionPolicyResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateGroupPolicyDecisionPolicyResponse>,
  ): MsgUpdateGroupPolicyDecisionPolicyResponse {
    const message = createBaseMsgUpdateGroupPolicyDecisionPolicyResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupPolicyDecisionPolicyResponseProtoMsg,
  ): MsgUpdateGroupPolicyDecisionPolicyResponse {
    return MsgUpdateGroupPolicyDecisionPolicyResponse.decode(message.value);
  },
  toProto(message: MsgUpdateGroupPolicyDecisionPolicyResponse): Uint8Array {
    return MsgUpdateGroupPolicyDecisionPolicyResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupPolicyDecisionPolicyResponse,
  ): MsgUpdateGroupPolicyDecisionPolicyResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyDecisionPolicyResponse',
      value:
        MsgUpdateGroupPolicyDecisionPolicyResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupPolicyMetadata(): MsgUpdateGroupPolicyMetadata {
  return {
    admin: '',
    groupPolicyAddress: '',
    metadata: '',
  };
}
/**
 * MsgUpdateGroupPolicyMetadata is the Msg/UpdateGroupPolicyMetadata request type.
 * @name MsgUpdateGroupPolicyMetadata
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadata
 */
export const MsgUpdateGroupPolicyMetadata = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyMetadata' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupPolicyMetadata' as const,
  is(o: any): o is MsgUpdateGroupPolicyMetadata {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupPolicyMetadata.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.groupPolicyAddress === 'string' &&
          typeof o.metadata === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateGroupPolicyMetadataSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateGroupPolicyMetadata.typeUrl ||
        (typeof o.admin === 'string' &&
          typeof o.group_policy_address === 'string' &&
          typeof o.metadata === 'string'))
    );
  },
  encode(
    message: MsgUpdateGroupPolicyMetadata,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.groupPolicyAddress !== '') {
      writer.uint32(18).string(message.groupPolicyAddress);
    }
    if (message.metadata !== '') {
      writer.uint32(26).string(message.metadata);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupPolicyMetadata {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupPolicyMetadata();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.groupPolicyAddress = reader.string();
          break;
        case 3:
          message.metadata = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateGroupPolicyMetadata {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      groupPolicyAddress: isSet(object.groupPolicyAddress)
        ? String(object.groupPolicyAddress)
        : '',
      metadata: isSet(object.metadata) ? String(object.metadata) : '',
    };
  },
  toJSON(
    message: MsgUpdateGroupPolicyMetadata,
  ): JsonSafe<MsgUpdateGroupPolicyMetadata> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.groupPolicyAddress !== undefined &&
      (obj.groupPolicyAddress = message.groupPolicyAddress);
    message.metadata !== undefined && (obj.metadata = message.metadata);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateGroupPolicyMetadata>,
  ): MsgUpdateGroupPolicyMetadata {
    const message = createBaseMsgUpdateGroupPolicyMetadata();
    message.admin = object.admin ?? '';
    message.groupPolicyAddress = object.groupPolicyAddress ?? '';
    message.metadata = object.metadata ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupPolicyMetadataProtoMsg,
  ): MsgUpdateGroupPolicyMetadata {
    return MsgUpdateGroupPolicyMetadata.decode(message.value);
  },
  toProto(message: MsgUpdateGroupPolicyMetadata): Uint8Array {
    return MsgUpdateGroupPolicyMetadata.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupPolicyMetadata,
  ): MsgUpdateGroupPolicyMetadataProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyMetadata',
      value: MsgUpdateGroupPolicyMetadata.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateGroupPolicyMetadataResponse(): MsgUpdateGroupPolicyMetadataResponse {
  return {};
}
/**
 * MsgUpdateGroupPolicyMetadataResponse is the Msg/UpdateGroupPolicyMetadata response type.
 * @name MsgUpdateGroupPolicyMetadataResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse
 */
export const MsgUpdateGroupPolicyMetadataResponse = {
  typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateGroupPolicyMetadataResponse' as const,
  is(o: any): o is MsgUpdateGroupPolicyMetadataResponse {
    return o && o.$typeUrl === MsgUpdateGroupPolicyMetadataResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateGroupPolicyMetadataResponseSDKType {
    return o && o.$typeUrl === MsgUpdateGroupPolicyMetadataResponse.typeUrl;
  },
  encode(
    _: MsgUpdateGroupPolicyMetadataResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateGroupPolicyMetadataResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateGroupPolicyMetadataResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateGroupPolicyMetadataResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateGroupPolicyMetadataResponse,
  ): JsonSafe<MsgUpdateGroupPolicyMetadataResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateGroupPolicyMetadataResponse>,
  ): MsgUpdateGroupPolicyMetadataResponse {
    const message = createBaseMsgUpdateGroupPolicyMetadataResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateGroupPolicyMetadataResponseProtoMsg,
  ): MsgUpdateGroupPolicyMetadataResponse {
    return MsgUpdateGroupPolicyMetadataResponse.decode(message.value);
  },
  toProto(message: MsgUpdateGroupPolicyMetadataResponse): Uint8Array {
    return MsgUpdateGroupPolicyMetadataResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateGroupPolicyMetadataResponse,
  ): MsgUpdateGroupPolicyMetadataResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgUpdateGroupPolicyMetadataResponse',
      value: MsgUpdateGroupPolicyMetadataResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSubmitProposal(): MsgSubmitProposal {
  return {
    groupPolicyAddress: '',
    proposers: [],
    metadata: '',
    messages: [],
    exec: 0,
    title: '',
    summary: '',
  };
}
/**
 * MsgSubmitProposal is the Msg/SubmitProposal request type.
 * @name MsgSubmitProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposal
 */
export const MsgSubmitProposal = {
  typeUrl: '/cosmos.group.v1.MsgSubmitProposal' as const,
  aminoType: 'cosmos-sdk/group/MsgSubmitProposal' as const,
  is(o: any): o is MsgSubmitProposal {
    return (
      o &&
      (o.$typeUrl === MsgSubmitProposal.typeUrl ||
        (typeof o.groupPolicyAddress === 'string' &&
          Array.isArray(o.proposers) &&
          (!o.proposers.length || typeof o.proposers[0] === 'string') &&
          typeof o.metadata === 'string' &&
          Array.isArray(o.messages) &&
          (!o.messages.length || Any.is(o.messages[0])) &&
          isSet(o.exec) &&
          typeof o.title === 'string' &&
          typeof o.summary === 'string'))
    );
  },
  isSDK(o: any): o is MsgSubmitProposalSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSubmitProposal.typeUrl ||
        (typeof o.group_policy_address === 'string' &&
          Array.isArray(o.proposers) &&
          (!o.proposers.length || typeof o.proposers[0] === 'string') &&
          typeof o.metadata === 'string' &&
          Array.isArray(o.messages) &&
          (!o.messages.length || Any.isSDK(o.messages[0])) &&
          isSet(o.exec) &&
          typeof o.title === 'string' &&
          typeof o.summary === 'string'))
    );
  },
  encode(
    message: MsgSubmitProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupPolicyAddress !== '') {
      writer.uint32(10).string(message.groupPolicyAddress);
    }
    for (const v of message.proposers) {
      writer.uint32(18).string(v!);
    }
    if (message.metadata !== '') {
      writer.uint32(26).string(message.metadata);
    }
    for (const v of message.messages) {
      Any.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.exec !== 0) {
      writer.uint32(40).int32(message.exec);
    }
    if (message.title !== '') {
      writer.uint32(50).string(message.title);
    }
    if (message.summary !== '') {
      writer.uint32(58).string(message.summary);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSubmitProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupPolicyAddress = reader.string();
          break;
        case 2:
          message.proposers.push(reader.string());
          break;
        case 3:
          message.metadata = reader.string();
          break;
        case 4:
          message.messages.push(Any.decode(reader, reader.uint32()));
          break;
        case 5:
          message.exec = reader.int32() as any;
          break;
        case 6:
          message.title = reader.string();
          break;
        case 7:
          message.summary = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSubmitProposal {
    return {
      groupPolicyAddress: isSet(object.groupPolicyAddress)
        ? String(object.groupPolicyAddress)
        : '',
      proposers: Array.isArray(object?.proposers)
        ? object.proposers.map((e: any) => String(e))
        : [],
      metadata: isSet(object.metadata) ? String(object.metadata) : '',
      messages: Array.isArray(object?.messages)
        ? object.messages.map((e: any) => Any.fromJSON(e))
        : [],
      exec: isSet(object.exec) ? execFromJSON(object.exec) : -1,
      title: isSet(object.title) ? String(object.title) : '',
      summary: isSet(object.summary) ? String(object.summary) : '',
    };
  },
  toJSON(message: MsgSubmitProposal): JsonSafe<MsgSubmitProposal> {
    const obj: any = {};
    message.groupPolicyAddress !== undefined &&
      (obj.groupPolicyAddress = message.groupPolicyAddress);
    if (message.proposers) {
      obj.proposers = message.proposers.map(e => e);
    } else {
      obj.proposers = [];
    }
    message.metadata !== undefined && (obj.metadata = message.metadata);
    if (message.messages) {
      obj.messages = message.messages.map(e => (e ? Any.toJSON(e) : undefined));
    } else {
      obj.messages = [];
    }
    message.exec !== undefined && (obj.exec = execToJSON(message.exec));
    message.title !== undefined && (obj.title = message.title);
    message.summary !== undefined && (obj.summary = message.summary);
    return obj;
  },
  fromPartial(object: Partial<MsgSubmitProposal>): MsgSubmitProposal {
    const message = createBaseMsgSubmitProposal();
    message.groupPolicyAddress = object.groupPolicyAddress ?? '';
    message.proposers = object.proposers?.map(e => e) || [];
    message.metadata = object.metadata ?? '';
    message.messages = object.messages?.map(e => Any.fromPartial(e)) || [];
    message.exec = object.exec ?? 0;
    message.title = object.title ?? '';
    message.summary = object.summary ?? '';
    return message;
  },
  fromProtoMsg(message: MsgSubmitProposalProtoMsg): MsgSubmitProposal {
    return MsgSubmitProposal.decode(message.value);
  },
  toProto(message: MsgSubmitProposal): Uint8Array {
    return MsgSubmitProposal.encode(message).finish();
  },
  toProtoMsg(message: MsgSubmitProposal): MsgSubmitProposalProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgSubmitProposal',
      value: MsgSubmitProposal.encode(message).finish(),
    };
  },
};
function createBaseMsgSubmitProposalResponse(): MsgSubmitProposalResponse {
  return {
    proposalId: BigInt(0),
  };
}
/**
 * MsgSubmitProposalResponse is the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgSubmitProposalResponse
 */
export const MsgSubmitProposalResponse = {
  typeUrl: '/cosmos.group.v1.MsgSubmitProposalResponse' as const,
  aminoType: 'cosmos-sdk/MsgSubmitProposalResponse' as const,
  is(o: any): o is MsgSubmitProposalResponse {
    return (
      o &&
      (o.$typeUrl === MsgSubmitProposalResponse.typeUrl ||
        typeof o.proposalId === 'bigint')
    );
  },
  isSDK(o: any): o is MsgSubmitProposalResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSubmitProposalResponse.typeUrl ||
        typeof o.proposal_id === 'bigint')
    );
  },
  encode(
    message: MsgSubmitProposalResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSubmitProposalResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSubmitProposalResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSubmitProposalResponse {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgSubmitProposalResponse,
  ): JsonSafe<MsgSubmitProposalResponse> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgSubmitProposalResponse>,
  ): MsgSubmitProposalResponse {
    const message = createBaseMsgSubmitProposalResponse();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgSubmitProposalResponseProtoMsg,
  ): MsgSubmitProposalResponse {
    return MsgSubmitProposalResponse.decode(message.value);
  },
  toProto(message: MsgSubmitProposalResponse): Uint8Array {
    return MsgSubmitProposalResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSubmitProposalResponse,
  ): MsgSubmitProposalResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgSubmitProposalResponse',
      value: MsgSubmitProposalResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawProposal(): MsgWithdrawProposal {
  return {
    proposalId: BigInt(0),
    address: '',
  };
}
/**
 * MsgWithdrawProposal is the Msg/WithdrawProposal request type.
 * @name MsgWithdrawProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposal
 */
export const MsgWithdrawProposal = {
  typeUrl: '/cosmos.group.v1.MsgWithdrawProposal' as const,
  aminoType: 'cosmos-sdk/group/MsgWithdrawProposal' as const,
  is(o: any): o is MsgWithdrawProposal {
    return (
      o &&
      (o.$typeUrl === MsgWithdrawProposal.typeUrl ||
        (typeof o.proposalId === 'bigint' && typeof o.address === 'string'))
    );
  },
  isSDK(o: any): o is MsgWithdrawProposalSDKType {
    return (
      o &&
      (o.$typeUrl === MsgWithdrawProposal.typeUrl ||
        (typeof o.proposal_id === 'bigint' && typeof o.address === 'string'))
    );
  },
  encode(
    message: MsgWithdrawProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.address !== '') {
      writer.uint32(18).string(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawProposal {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(message: MsgWithdrawProposal): JsonSafe<MsgWithdrawProposal> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(object: Partial<MsgWithdrawProposal>): MsgWithdrawProposal {
    const message = createBaseMsgWithdrawProposal();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(message: MsgWithdrawProposalProtoMsg): MsgWithdrawProposal {
    return MsgWithdrawProposal.decode(message.value);
  },
  toProto(message: MsgWithdrawProposal): Uint8Array {
    return MsgWithdrawProposal.encode(message).finish();
  },
  toProtoMsg(message: MsgWithdrawProposal): MsgWithdrawProposalProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgWithdrawProposal',
      value: MsgWithdrawProposal.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawProposalResponse(): MsgWithdrawProposalResponse {
  return {};
}
/**
 * MsgWithdrawProposalResponse is the Msg/WithdrawProposal response type.
 * @name MsgWithdrawProposalResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgWithdrawProposalResponse
 */
export const MsgWithdrawProposalResponse = {
  typeUrl: '/cosmos.group.v1.MsgWithdrawProposalResponse' as const,
  aminoType: 'cosmos-sdk/MsgWithdrawProposalResponse' as const,
  is(o: any): o is MsgWithdrawProposalResponse {
    return o && o.$typeUrl === MsgWithdrawProposalResponse.typeUrl;
  },
  isSDK(o: any): o is MsgWithdrawProposalResponseSDKType {
    return o && o.$typeUrl === MsgWithdrawProposalResponse.typeUrl;
  },
  encode(
    _: MsgWithdrawProposalResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawProposalResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawProposalResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgWithdrawProposalResponse {
    return {};
  },
  toJSON(
    _: MsgWithdrawProposalResponse,
  ): JsonSafe<MsgWithdrawProposalResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgWithdrawProposalResponse>,
  ): MsgWithdrawProposalResponse {
    const message = createBaseMsgWithdrawProposalResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawProposalResponseProtoMsg,
  ): MsgWithdrawProposalResponse {
    return MsgWithdrawProposalResponse.decode(message.value);
  },
  toProto(message: MsgWithdrawProposalResponse): Uint8Array {
    return MsgWithdrawProposalResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawProposalResponse,
  ): MsgWithdrawProposalResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgWithdrawProposalResponse',
      value: MsgWithdrawProposalResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgVote(): MsgVote {
  return {
    proposalId: BigInt(0),
    voter: '',
    option: 0,
    metadata: '',
    exec: 0,
  };
}
/**
 * MsgVote is the Msg/Vote request type.
 * @name MsgVote
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVote
 */
export const MsgVote = {
  typeUrl: '/cosmos.group.v1.MsgVote' as const,
  aminoType: 'cosmos-sdk/group/MsgVote' as const,
  is(o: any): o is MsgVote {
    return (
      o &&
      (o.$typeUrl === MsgVote.typeUrl ||
        (typeof o.proposalId === 'bigint' &&
          typeof o.voter === 'string' &&
          isSet(o.option) &&
          typeof o.metadata === 'string' &&
          isSet(o.exec)))
    );
  },
  isSDK(o: any): o is MsgVoteSDKType {
    return (
      o &&
      (o.$typeUrl === MsgVote.typeUrl ||
        (typeof o.proposal_id === 'bigint' &&
          typeof o.voter === 'string' &&
          isSet(o.option) &&
          typeof o.metadata === 'string' &&
          isSet(o.exec)))
    );
  },
  encode(
    message: MsgVote,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.voter !== '') {
      writer.uint32(18).string(message.voter);
    }
    if (message.option !== 0) {
      writer.uint32(24).int32(message.option);
    }
    if (message.metadata !== '') {
      writer.uint32(34).string(message.metadata);
    }
    if (message.exec !== 0) {
      writer.uint32(40).int32(message.exec);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgVote {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgVote();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.voter = reader.string();
          break;
        case 3:
          message.option = reader.int32() as any;
          break;
        case 4:
          message.metadata = reader.string();
          break;
        case 5:
          message.exec = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgVote {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      voter: isSet(object.voter) ? String(object.voter) : '',
      option: isSet(object.option) ? voteOptionFromJSON(object.option) : -1,
      metadata: isSet(object.metadata) ? String(object.metadata) : '',
      exec: isSet(object.exec) ? execFromJSON(object.exec) : -1,
    };
  },
  toJSON(message: MsgVote): JsonSafe<MsgVote> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.voter !== undefined && (obj.voter = message.voter);
    message.option !== undefined &&
      (obj.option = voteOptionToJSON(message.option));
    message.metadata !== undefined && (obj.metadata = message.metadata);
    message.exec !== undefined && (obj.exec = execToJSON(message.exec));
    return obj;
  },
  fromPartial(object: Partial<MsgVote>): MsgVote {
    const message = createBaseMsgVote();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.voter = object.voter ?? '';
    message.option = object.option ?? 0;
    message.metadata = object.metadata ?? '';
    message.exec = object.exec ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgVoteProtoMsg): MsgVote {
    return MsgVote.decode(message.value);
  },
  toProto(message: MsgVote): Uint8Array {
    return MsgVote.encode(message).finish();
  },
  toProtoMsg(message: MsgVote): MsgVoteProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgVote',
      value: MsgVote.encode(message).finish(),
    };
  },
};
function createBaseMsgVoteResponse(): MsgVoteResponse {
  return {};
}
/**
 * MsgVoteResponse is the Msg/Vote response type.
 * @name MsgVoteResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgVoteResponse
 */
export const MsgVoteResponse = {
  typeUrl: '/cosmos.group.v1.MsgVoteResponse' as const,
  aminoType: 'cosmos-sdk/MsgVoteResponse' as const,
  is(o: any): o is MsgVoteResponse {
    return o && o.$typeUrl === MsgVoteResponse.typeUrl;
  },
  isSDK(o: any): o is MsgVoteResponseSDKType {
    return o && o.$typeUrl === MsgVoteResponse.typeUrl;
  },
  encode(
    _: MsgVoteResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgVoteResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgVoteResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgVoteResponse {
    return {};
  },
  toJSON(_: MsgVoteResponse): JsonSafe<MsgVoteResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgVoteResponse>): MsgVoteResponse {
    const message = createBaseMsgVoteResponse();
    return message;
  },
  fromProtoMsg(message: MsgVoteResponseProtoMsg): MsgVoteResponse {
    return MsgVoteResponse.decode(message.value);
  },
  toProto(message: MsgVoteResponse): Uint8Array {
    return MsgVoteResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgVoteResponse): MsgVoteResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgVoteResponse',
      value: MsgVoteResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgExec(): MsgExec {
  return {
    proposalId: BigInt(0),
    executor: '',
  };
}
/**
 * MsgExec is the Msg/Exec request type.
 * @name MsgExec
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExec
 */
export const MsgExec = {
  typeUrl: '/cosmos.group.v1.MsgExec' as const,
  aminoType: 'cosmos-sdk/group/MsgExec' as const,
  is(o: any): o is MsgExec {
    return (
      o &&
      (o.$typeUrl === MsgExec.typeUrl ||
        (typeof o.proposalId === 'bigint' && typeof o.executor === 'string'))
    );
  },
  isSDK(o: any): o is MsgExecSDKType {
    return (
      o &&
      (o.$typeUrl === MsgExec.typeUrl ||
        (typeof o.proposal_id === 'bigint' && typeof o.executor === 'string'))
    );
  },
  encode(
    message: MsgExec,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.executor !== '') {
      writer.uint32(18).string(message.executor);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgExec {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExec();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.executor = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExec {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      executor: isSet(object.executor) ? String(object.executor) : '',
    };
  },
  toJSON(message: MsgExec): JsonSafe<MsgExec> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.executor !== undefined && (obj.executor = message.executor);
    return obj;
  },
  fromPartial(object: Partial<MsgExec>): MsgExec {
    const message = createBaseMsgExec();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.executor = object.executor ?? '';
    return message;
  },
  fromProtoMsg(message: MsgExecProtoMsg): MsgExec {
    return MsgExec.decode(message.value);
  },
  toProto(message: MsgExec): Uint8Array {
    return MsgExec.encode(message).finish();
  },
  toProtoMsg(message: MsgExec): MsgExecProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgExec',
      value: MsgExec.encode(message).finish(),
    };
  },
};
function createBaseMsgExecResponse(): MsgExecResponse {
  return {
    result: 0,
  };
}
/**
 * MsgExecResponse is the Msg/Exec request type.
 * @name MsgExecResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgExecResponse
 */
export const MsgExecResponse = {
  typeUrl: '/cosmos.group.v1.MsgExecResponse' as const,
  aminoType: 'cosmos-sdk/MsgExecResponse' as const,
  is(o: any): o is MsgExecResponse {
    return o && (o.$typeUrl === MsgExecResponse.typeUrl || isSet(o.result));
  },
  isSDK(o: any): o is MsgExecResponseSDKType {
    return o && (o.$typeUrl === MsgExecResponse.typeUrl || isSet(o.result));
  },
  encode(
    message: MsgExecResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(16).int32(message.result);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgExecResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExecResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExecResponse {
    return {
      result: isSet(object.result)
        ? proposalExecutorResultFromJSON(object.result)
        : -1,
    };
  },
  toJSON(message: MsgExecResponse): JsonSafe<MsgExecResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = proposalExecutorResultToJSON(message.result));
    return obj;
  },
  fromPartial(object: Partial<MsgExecResponse>): MsgExecResponse {
    const message = createBaseMsgExecResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgExecResponseProtoMsg): MsgExecResponse {
    return MsgExecResponse.decode(message.value);
  },
  toProto(message: MsgExecResponse): Uint8Array {
    return MsgExecResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgExecResponse): MsgExecResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgExecResponse',
      value: MsgExecResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgLeaveGroup(): MsgLeaveGroup {
  return {
    address: '',
    groupId: BigInt(0),
  };
}
/**
 * MsgLeaveGroup is the Msg/LeaveGroup request type.
 * @name MsgLeaveGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroup
 */
export const MsgLeaveGroup = {
  typeUrl: '/cosmos.group.v1.MsgLeaveGroup' as const,
  aminoType: 'cosmos-sdk/group/MsgLeaveGroup' as const,
  is(o: any): o is MsgLeaveGroup {
    return (
      o &&
      (o.$typeUrl === MsgLeaveGroup.typeUrl ||
        (typeof o.address === 'string' && typeof o.groupId === 'bigint'))
    );
  },
  isSDK(o: any): o is MsgLeaveGroupSDKType {
    return (
      o &&
      (o.$typeUrl === MsgLeaveGroup.typeUrl ||
        (typeof o.address === 'string' && typeof o.group_id === 'bigint'))
    );
  },
  encode(
    message: MsgLeaveGroup,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.groupId !== BigInt(0)) {
      writer.uint32(16).uint64(message.groupId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLeaveGroup {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLeaveGroup();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.groupId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLeaveGroup {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgLeaveGroup): JsonSafe<MsgLeaveGroup> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgLeaveGroup>): MsgLeaveGroup {
    const message = createBaseMsgLeaveGroup();
    message.address = object.address ?? '';
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MsgLeaveGroupProtoMsg): MsgLeaveGroup {
    return MsgLeaveGroup.decode(message.value);
  },
  toProto(message: MsgLeaveGroup): Uint8Array {
    return MsgLeaveGroup.encode(message).finish();
  },
  toProtoMsg(message: MsgLeaveGroup): MsgLeaveGroupProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgLeaveGroup',
      value: MsgLeaveGroup.encode(message).finish(),
    };
  },
};
function createBaseMsgLeaveGroupResponse(): MsgLeaveGroupResponse {
  return {};
}
/**
 * MsgLeaveGroupResponse is the Msg/LeaveGroup response type.
 * @name MsgLeaveGroupResponse
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.MsgLeaveGroupResponse
 */
export const MsgLeaveGroupResponse = {
  typeUrl: '/cosmos.group.v1.MsgLeaveGroupResponse' as const,
  aminoType: 'cosmos-sdk/MsgLeaveGroupResponse' as const,
  is(o: any): o is MsgLeaveGroupResponse {
    return o && o.$typeUrl === MsgLeaveGroupResponse.typeUrl;
  },
  isSDK(o: any): o is MsgLeaveGroupResponseSDKType {
    return o && o.$typeUrl === MsgLeaveGroupResponse.typeUrl;
  },
  encode(
    _: MsgLeaveGroupResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLeaveGroupResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLeaveGroupResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgLeaveGroupResponse {
    return {};
  },
  toJSON(_: MsgLeaveGroupResponse): JsonSafe<MsgLeaveGroupResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgLeaveGroupResponse>): MsgLeaveGroupResponse {
    const message = createBaseMsgLeaveGroupResponse();
    return message;
  },
  fromProtoMsg(message: MsgLeaveGroupResponseProtoMsg): MsgLeaveGroupResponse {
    return MsgLeaveGroupResponse.decode(message.value);
  },
  toProto(message: MsgLeaveGroupResponse): Uint8Array {
    return MsgLeaveGroupResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgLeaveGroupResponse): MsgLeaveGroupResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.MsgLeaveGroupResponse',
      value: MsgLeaveGroupResponse.encode(message).finish(),
    };
  },
};
