//@ts-nocheck
import {
  GroupInfo,
  type GroupInfoSDKType,
  GroupMember,
  type GroupMemberSDKType,
  GroupPolicyInfo,
  type GroupPolicyInfoSDKType,
  Proposal,
  type ProposalSDKType,
  Vote,
  type VoteSDKType,
} from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** GenesisState defines the group module's genesis state. */
export interface GenesisState {
  /**
   * group_seq is the group table orm.Sequence,
   * it is used to get the next group ID.
   */
  groupSeq: bigint;
  /** groups is the list of groups info. */
  groups: GroupInfo[];
  /** group_members is the list of groups members. */
  groupMembers: GroupMember[];
  /**
   * group_policy_seq is the group policy table orm.Sequence,
   * it is used to generate the next group policy account address.
   */
  groupPolicySeq: bigint;
  /** group_policies is the list of group policies info. */
  groupPolicies: GroupPolicyInfo[];
  /**
   * proposal_seq is the proposal table orm.Sequence,
   * it is used to get the next proposal ID.
   */
  proposalSeq: bigint;
  /** proposals is the list of proposals. */
  proposals: Proposal[];
  /** votes is the list of votes. */
  votes: Vote[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/cosmos.group.v1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines the group module's genesis state. */
export interface GenesisStateSDKType {
  group_seq: bigint;
  groups: GroupInfoSDKType[];
  group_members: GroupMemberSDKType[];
  group_policy_seq: bigint;
  group_policies: GroupPolicyInfoSDKType[];
  proposal_seq: bigint;
  proposals: ProposalSDKType[];
  votes: VoteSDKType[];
}
function createBaseGenesisState(): GenesisState {
  return {
    groupSeq: BigInt(0),
    groups: [],
    groupMembers: [],
    groupPolicySeq: BigInt(0),
    groupPolicies: [],
    proposalSeq: BigInt(0),
    proposals: [],
    votes: [],
  };
}
export const GenesisState = {
  typeUrl: '/cosmos.group.v1.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupSeq !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupSeq);
    }
    for (const v of message.groups) {
      GroupInfo.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.groupMembers) {
      GroupMember.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.groupPolicySeq !== BigInt(0)) {
      writer.uint32(32).uint64(message.groupPolicySeq);
    }
    for (const v of message.groupPolicies) {
      GroupPolicyInfo.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    if (message.proposalSeq !== BigInt(0)) {
      writer.uint32(48).uint64(message.proposalSeq);
    }
    for (const v of message.proposals) {
      Proposal.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    for (const v of message.votes) {
      Vote.encode(v!, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GenesisState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupSeq = reader.uint64();
          break;
        case 2:
          message.groups.push(GroupInfo.decode(reader, reader.uint32()));
          break;
        case 3:
          message.groupMembers.push(
            GroupMember.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          message.groupPolicySeq = reader.uint64();
          break;
        case 5:
          message.groupPolicies.push(
            GroupPolicyInfo.decode(reader, reader.uint32()),
          );
          break;
        case 6:
          message.proposalSeq = reader.uint64();
          break;
        case 7:
          message.proposals.push(Proposal.decode(reader, reader.uint32()));
          break;
        case 8:
          message.votes.push(Vote.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      groupSeq: isSet(object.groupSeq)
        ? BigInt(object.groupSeq.toString())
        : BigInt(0),
      groups: Array.isArray(object?.groups)
        ? object.groups.map((e: any) => GroupInfo.fromJSON(e))
        : [],
      groupMembers: Array.isArray(object?.groupMembers)
        ? object.groupMembers.map((e: any) => GroupMember.fromJSON(e))
        : [],
      groupPolicySeq: isSet(object.groupPolicySeq)
        ? BigInt(object.groupPolicySeq.toString())
        : BigInt(0),
      groupPolicies: Array.isArray(object?.groupPolicies)
        ? object.groupPolicies.map((e: any) => GroupPolicyInfo.fromJSON(e))
        : [],
      proposalSeq: isSet(object.proposalSeq)
        ? BigInt(object.proposalSeq.toString())
        : BigInt(0),
      proposals: Array.isArray(object?.proposals)
        ? object.proposals.map((e: any) => Proposal.fromJSON(e))
        : [],
      votes: Array.isArray(object?.votes)
        ? object.votes.map((e: any) => Vote.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    message.groupSeq !== undefined &&
      (obj.groupSeq = (message.groupSeq || BigInt(0)).toString());
    if (message.groups) {
      obj.groups = message.groups.map(e =>
        e ? GroupInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groups = [];
    }
    if (message.groupMembers) {
      obj.groupMembers = message.groupMembers.map(e =>
        e ? GroupMember.toJSON(e) : undefined,
      );
    } else {
      obj.groupMembers = [];
    }
    message.groupPolicySeq !== undefined &&
      (obj.groupPolicySeq = (message.groupPolicySeq || BigInt(0)).toString());
    if (message.groupPolicies) {
      obj.groupPolicies = message.groupPolicies.map(e =>
        e ? GroupPolicyInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groupPolicies = [];
    }
    message.proposalSeq !== undefined &&
      (obj.proposalSeq = (message.proposalSeq || BigInt(0)).toString());
    if (message.proposals) {
      obj.proposals = message.proposals.map(e =>
        e ? Proposal.toJSON(e) : undefined,
      );
    } else {
      obj.proposals = [];
    }
    if (message.votes) {
      obj.votes = message.votes.map(e => (e ? Vote.toJSON(e) : undefined));
    } else {
      obj.votes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.groupSeq =
      object.groupSeq !== undefined && object.groupSeq !== null
        ? BigInt(object.groupSeq.toString())
        : BigInt(0);
    message.groups = object.groups?.map(e => GroupInfo.fromPartial(e)) || [];
    message.groupMembers =
      object.groupMembers?.map(e => GroupMember.fromPartial(e)) || [];
    message.groupPolicySeq =
      object.groupPolicySeq !== undefined && object.groupPolicySeq !== null
        ? BigInt(object.groupPolicySeq.toString())
        : BigInt(0);
    message.groupPolicies =
      object.groupPolicies?.map(e => GroupPolicyInfo.fromPartial(e)) || [];
    message.proposalSeq =
      object.proposalSeq !== undefined && object.proposalSeq !== null
        ? BigInt(object.proposalSeq.toString())
        : BigInt(0);
    message.proposals =
      object.proposals?.map(e => Proposal.fromPartial(e)) || [];
    message.votes = object.votes?.map(e => Vote.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
