//@ts-nocheck
import {
  ProposalExecutorResult,
  ProposalStatus,
  TallyResult,
  type TallyResultSDKType,
  proposalExecutorResultFromJSON,
  proposalExecutorResultToJSON,
  proposalStatusFromJSON,
  proposalStatusToJSON,
} from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * EventCreateGroup is an event emitted when a group is created.
 * @name EventCreateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroup
 */
export interface EventCreateGroup {
  /**
   * group_id is the unique ID of the group.
   */
  groupId: bigint;
}
export interface EventCreateGroupProtoMsg {
  typeUrl: '/cosmos.group.v1.EventCreateGroup';
  value: Uint8Array;
}
/**
 * EventCreateGroup is an event emitted when a group is created.
 * @name EventCreateGroupSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroup
 */
export interface EventCreateGroupSDKType {
  group_id: bigint;
}
/**
 * EventUpdateGroup is an event emitted when a group is updated.
 * @name EventUpdateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroup
 */
export interface EventUpdateGroup {
  /**
   * group_id is the unique ID of the group.
   */
  groupId: bigint;
}
export interface EventUpdateGroupProtoMsg {
  typeUrl: '/cosmos.group.v1.EventUpdateGroup';
  value: Uint8Array;
}
/**
 * EventUpdateGroup is an event emitted when a group is updated.
 * @name EventUpdateGroupSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroup
 */
export interface EventUpdateGroupSDKType {
  group_id: bigint;
}
/**
 * EventCreateGroupPolicy is an event emitted when a group policy is created.
 * @name EventCreateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroupPolicy
 */
export interface EventCreateGroupPolicy {
  /**
   * address is the account address of the group policy.
   */
  address: string;
}
export interface EventCreateGroupPolicyProtoMsg {
  typeUrl: '/cosmos.group.v1.EventCreateGroupPolicy';
  value: Uint8Array;
}
/**
 * EventCreateGroupPolicy is an event emitted when a group policy is created.
 * @name EventCreateGroupPolicySDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroupPolicy
 */
export interface EventCreateGroupPolicySDKType {
  address: string;
}
/**
 * EventUpdateGroupPolicy is an event emitted when a group policy is updated.
 * @name EventUpdateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroupPolicy
 */
export interface EventUpdateGroupPolicy {
  /**
   * address is the account address of the group policy.
   */
  address: string;
}
export interface EventUpdateGroupPolicyProtoMsg {
  typeUrl: '/cosmos.group.v1.EventUpdateGroupPolicy';
  value: Uint8Array;
}
/**
 * EventUpdateGroupPolicy is an event emitted when a group policy is updated.
 * @name EventUpdateGroupPolicySDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroupPolicy
 */
export interface EventUpdateGroupPolicySDKType {
  address: string;
}
/**
 * EventSubmitProposal is an event emitted when a proposal is created.
 * @name EventSubmitProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventSubmitProposal
 */
export interface EventSubmitProposal {
  /**
   * proposal_id is the unique ID of the proposal.
   */
  proposalId: bigint;
}
export interface EventSubmitProposalProtoMsg {
  typeUrl: '/cosmos.group.v1.EventSubmitProposal';
  value: Uint8Array;
}
/**
 * EventSubmitProposal is an event emitted when a proposal is created.
 * @name EventSubmitProposalSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventSubmitProposal
 */
export interface EventSubmitProposalSDKType {
  proposal_id: bigint;
}
/**
 * EventWithdrawProposal is an event emitted when a proposal is withdrawn.
 * @name EventWithdrawProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventWithdrawProposal
 */
export interface EventWithdrawProposal {
  /**
   * proposal_id is the unique ID of the proposal.
   */
  proposalId: bigint;
}
export interface EventWithdrawProposalProtoMsg {
  typeUrl: '/cosmos.group.v1.EventWithdrawProposal';
  value: Uint8Array;
}
/**
 * EventWithdrawProposal is an event emitted when a proposal is withdrawn.
 * @name EventWithdrawProposalSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventWithdrawProposal
 */
export interface EventWithdrawProposalSDKType {
  proposal_id: bigint;
}
/**
 * EventVote is an event emitted when a voter votes on a proposal.
 * @name EventVote
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventVote
 */
export interface EventVote {
  /**
   * proposal_id is the unique ID of the proposal.
   */
  proposalId: bigint;
}
export interface EventVoteProtoMsg {
  typeUrl: '/cosmos.group.v1.EventVote';
  value: Uint8Array;
}
/**
 * EventVote is an event emitted when a voter votes on a proposal.
 * @name EventVoteSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventVote
 */
export interface EventVoteSDKType {
  proposal_id: bigint;
}
/**
 * EventExec is an event emitted when a proposal is executed.
 * @name EventExec
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventExec
 */
export interface EventExec {
  /**
   * proposal_id is the unique ID of the proposal.
   */
  proposalId: bigint;
  /**
   * result is the proposal execution result.
   */
  result: ProposalExecutorResult;
  /**
   * logs contains error logs in case the execution result is FAILURE.
   */
  logs: string;
}
export interface EventExecProtoMsg {
  typeUrl: '/cosmos.group.v1.EventExec';
  value: Uint8Array;
}
/**
 * EventExec is an event emitted when a proposal is executed.
 * @name EventExecSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventExec
 */
export interface EventExecSDKType {
  proposal_id: bigint;
  result: ProposalExecutorResult;
  logs: string;
}
/**
 * EventLeaveGroup is an event emitted when group member leaves the group.
 * @name EventLeaveGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventLeaveGroup
 */
export interface EventLeaveGroup {
  /**
   * group_id is the unique ID of the group.
   */
  groupId: bigint;
  /**
   * address is the account address of the group member.
   */
  address: string;
}
export interface EventLeaveGroupProtoMsg {
  typeUrl: '/cosmos.group.v1.EventLeaveGroup';
  value: Uint8Array;
}
/**
 * EventLeaveGroup is an event emitted when group member leaves the group.
 * @name EventLeaveGroupSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventLeaveGroup
 */
export interface EventLeaveGroupSDKType {
  group_id: bigint;
  address: string;
}
/**
 * EventProposalPruned is an event emitted when a proposal is pruned.
 * @name EventProposalPruned
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventProposalPruned
 */
export interface EventProposalPruned {
  /**
   * proposal_id is the unique ID of the proposal.
   */
  proposalId: bigint;
  /**
   * status is the proposal status (UNSPECIFIED, SUBMITTED, ACCEPTED, REJECTED, ABORTED, WITHDRAWN).
   */
  status: ProposalStatus;
  /**
   * tally_result is the proposal tally result (when applicable).
   */
  tallyResult?: TallyResult;
}
export interface EventProposalPrunedProtoMsg {
  typeUrl: '/cosmos.group.v1.EventProposalPruned';
  value: Uint8Array;
}
/**
 * EventProposalPruned is an event emitted when a proposal is pruned.
 * @name EventProposalPrunedSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventProposalPruned
 */
export interface EventProposalPrunedSDKType {
  proposal_id: bigint;
  status: ProposalStatus;
  tally_result?: TallyResultSDKType;
}
/**
 * EventTallyError is an event emitted when a proposal tally failed with an error.
 * @name EventTallyError
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventTallyError
 */
export interface EventTallyError {
  /**
   * proposal_id is the unique ID of the proposal.
   */
  proposalId: bigint;
  /**
   * error_message is the raw error output
   */
  errorMessage: string;
}
export interface EventTallyErrorProtoMsg {
  typeUrl: '/cosmos.group.v1.EventTallyError';
  value: Uint8Array;
}
/**
 * EventTallyError is an event emitted when a proposal tally failed with an error.
 * @name EventTallyErrorSDKType
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventTallyError
 */
export interface EventTallyErrorSDKType {
  proposal_id: bigint;
  error_message: string;
}
function createBaseEventCreateGroup(): EventCreateGroup {
  return {
    groupId: BigInt(0),
  };
}
/**
 * EventCreateGroup is an event emitted when a group is created.
 * @name EventCreateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroup
 */
export const EventCreateGroup = {
  typeUrl: '/cosmos.group.v1.EventCreateGroup' as const,
  aminoType: 'cosmos-sdk/EventCreateGroup' as const,
  is(o: any): o is EventCreateGroup {
    return (
      o &&
      (o.$typeUrl === EventCreateGroup.typeUrl || typeof o.groupId === 'bigint')
    );
  },
  isSDK(o: any): o is EventCreateGroupSDKType {
    return (
      o &&
      (o.$typeUrl === EventCreateGroup.typeUrl ||
        typeof o.group_id === 'bigint')
    );
  },
  encode(
    message: EventCreateGroup,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventCreateGroup {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventCreateGroup();
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
  fromJSON(object: any): EventCreateGroup {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventCreateGroup): JsonSafe<EventCreateGroup> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventCreateGroup>): EventCreateGroup {
    const message = createBaseEventCreateGroup();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventCreateGroupProtoMsg): EventCreateGroup {
    return EventCreateGroup.decode(message.value);
  },
  toProto(message: EventCreateGroup): Uint8Array {
    return EventCreateGroup.encode(message).finish();
  },
  toProtoMsg(message: EventCreateGroup): EventCreateGroupProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventCreateGroup',
      value: EventCreateGroup.encode(message).finish(),
    };
  },
};
function createBaseEventUpdateGroup(): EventUpdateGroup {
  return {
    groupId: BigInt(0),
  };
}
/**
 * EventUpdateGroup is an event emitted when a group is updated.
 * @name EventUpdateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroup
 */
export const EventUpdateGroup = {
  typeUrl: '/cosmos.group.v1.EventUpdateGroup' as const,
  aminoType: 'cosmos-sdk/EventUpdateGroup' as const,
  is(o: any): o is EventUpdateGroup {
    return (
      o &&
      (o.$typeUrl === EventUpdateGroup.typeUrl || typeof o.groupId === 'bigint')
    );
  },
  isSDK(o: any): o is EventUpdateGroupSDKType {
    return (
      o &&
      (o.$typeUrl === EventUpdateGroup.typeUrl ||
        typeof o.group_id === 'bigint')
    );
  },
  encode(
    message: EventUpdateGroup,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventUpdateGroup {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventUpdateGroup();
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
  fromJSON(object: any): EventUpdateGroup {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventUpdateGroup): JsonSafe<EventUpdateGroup> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventUpdateGroup>): EventUpdateGroup {
    const message = createBaseEventUpdateGroup();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventUpdateGroupProtoMsg): EventUpdateGroup {
    return EventUpdateGroup.decode(message.value);
  },
  toProto(message: EventUpdateGroup): Uint8Array {
    return EventUpdateGroup.encode(message).finish();
  },
  toProtoMsg(message: EventUpdateGroup): EventUpdateGroupProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventUpdateGroup',
      value: EventUpdateGroup.encode(message).finish(),
    };
  },
};
function createBaseEventCreateGroupPolicy(): EventCreateGroupPolicy {
  return {
    address: '',
  };
}
/**
 * EventCreateGroupPolicy is an event emitted when a group policy is created.
 * @name EventCreateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroupPolicy
 */
export const EventCreateGroupPolicy = {
  typeUrl: '/cosmos.group.v1.EventCreateGroupPolicy' as const,
  aminoType: 'cosmos-sdk/EventCreateGroupPolicy' as const,
  is(o: any): o is EventCreateGroupPolicy {
    return (
      o &&
      (o.$typeUrl === EventCreateGroupPolicy.typeUrl ||
        typeof o.address === 'string')
    );
  },
  isSDK(o: any): o is EventCreateGroupPolicySDKType {
    return (
      o &&
      (o.$typeUrl === EventCreateGroupPolicy.typeUrl ||
        typeof o.address === 'string')
    );
  },
  encode(
    message: EventCreateGroupPolicy,
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
  ): EventCreateGroupPolicy {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventCreateGroupPolicy();
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
  fromJSON(object: any): EventCreateGroupPolicy {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(message: EventCreateGroupPolicy): JsonSafe<EventCreateGroupPolicy> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(object: Partial<EventCreateGroupPolicy>): EventCreateGroupPolicy {
    const message = createBaseEventCreateGroupPolicy();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: EventCreateGroupPolicyProtoMsg,
  ): EventCreateGroupPolicy {
    return EventCreateGroupPolicy.decode(message.value);
  },
  toProto(message: EventCreateGroupPolicy): Uint8Array {
    return EventCreateGroupPolicy.encode(message).finish();
  },
  toProtoMsg(message: EventCreateGroupPolicy): EventCreateGroupPolicyProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventCreateGroupPolicy',
      value: EventCreateGroupPolicy.encode(message).finish(),
    };
  },
};
function createBaseEventUpdateGroupPolicy(): EventUpdateGroupPolicy {
  return {
    address: '',
  };
}
/**
 * EventUpdateGroupPolicy is an event emitted when a group policy is updated.
 * @name EventUpdateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroupPolicy
 */
export const EventUpdateGroupPolicy = {
  typeUrl: '/cosmos.group.v1.EventUpdateGroupPolicy' as const,
  aminoType: 'cosmos-sdk/EventUpdateGroupPolicy' as const,
  is(o: any): o is EventUpdateGroupPolicy {
    return (
      o &&
      (o.$typeUrl === EventUpdateGroupPolicy.typeUrl ||
        typeof o.address === 'string')
    );
  },
  isSDK(o: any): o is EventUpdateGroupPolicySDKType {
    return (
      o &&
      (o.$typeUrl === EventUpdateGroupPolicy.typeUrl ||
        typeof o.address === 'string')
    );
  },
  encode(
    message: EventUpdateGroupPolicy,
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
  ): EventUpdateGroupPolicy {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventUpdateGroupPolicy();
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
  fromJSON(object: any): EventUpdateGroupPolicy {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(message: EventUpdateGroupPolicy): JsonSafe<EventUpdateGroupPolicy> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(object: Partial<EventUpdateGroupPolicy>): EventUpdateGroupPolicy {
    const message = createBaseEventUpdateGroupPolicy();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: EventUpdateGroupPolicyProtoMsg,
  ): EventUpdateGroupPolicy {
    return EventUpdateGroupPolicy.decode(message.value);
  },
  toProto(message: EventUpdateGroupPolicy): Uint8Array {
    return EventUpdateGroupPolicy.encode(message).finish();
  },
  toProtoMsg(message: EventUpdateGroupPolicy): EventUpdateGroupPolicyProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventUpdateGroupPolicy',
      value: EventUpdateGroupPolicy.encode(message).finish(),
    };
  },
};
function createBaseEventSubmitProposal(): EventSubmitProposal {
  return {
    proposalId: BigInt(0),
  };
}
/**
 * EventSubmitProposal is an event emitted when a proposal is created.
 * @name EventSubmitProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventSubmitProposal
 */
export const EventSubmitProposal = {
  typeUrl: '/cosmos.group.v1.EventSubmitProposal' as const,
  aminoType: 'cosmos-sdk/EventSubmitProposal' as const,
  is(o: any): o is EventSubmitProposal {
    return (
      o &&
      (o.$typeUrl === EventSubmitProposal.typeUrl ||
        typeof o.proposalId === 'bigint')
    );
  },
  isSDK(o: any): o is EventSubmitProposalSDKType {
    return (
      o &&
      (o.$typeUrl === EventSubmitProposal.typeUrl ||
        typeof o.proposal_id === 'bigint')
    );
  },
  encode(
    message: EventSubmitProposal,
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
  ): EventSubmitProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSubmitProposal();
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
  fromJSON(object: any): EventSubmitProposal {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventSubmitProposal): JsonSafe<EventSubmitProposal> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventSubmitProposal>): EventSubmitProposal {
    const message = createBaseEventSubmitProposal();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventSubmitProposalProtoMsg): EventSubmitProposal {
    return EventSubmitProposal.decode(message.value);
  },
  toProto(message: EventSubmitProposal): Uint8Array {
    return EventSubmitProposal.encode(message).finish();
  },
  toProtoMsg(message: EventSubmitProposal): EventSubmitProposalProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventSubmitProposal',
      value: EventSubmitProposal.encode(message).finish(),
    };
  },
};
function createBaseEventWithdrawProposal(): EventWithdrawProposal {
  return {
    proposalId: BigInt(0),
  };
}
/**
 * EventWithdrawProposal is an event emitted when a proposal is withdrawn.
 * @name EventWithdrawProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventWithdrawProposal
 */
export const EventWithdrawProposal = {
  typeUrl: '/cosmos.group.v1.EventWithdrawProposal' as const,
  aminoType: 'cosmos-sdk/EventWithdrawProposal' as const,
  is(o: any): o is EventWithdrawProposal {
    return (
      o &&
      (o.$typeUrl === EventWithdrawProposal.typeUrl ||
        typeof o.proposalId === 'bigint')
    );
  },
  isSDK(o: any): o is EventWithdrawProposalSDKType {
    return (
      o &&
      (o.$typeUrl === EventWithdrawProposal.typeUrl ||
        typeof o.proposal_id === 'bigint')
    );
  },
  encode(
    message: EventWithdrawProposal,
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
  ): EventWithdrawProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventWithdrawProposal();
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
  fromJSON(object: any): EventWithdrawProposal {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventWithdrawProposal): JsonSafe<EventWithdrawProposal> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventWithdrawProposal>): EventWithdrawProposal {
    const message = createBaseEventWithdrawProposal();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventWithdrawProposalProtoMsg): EventWithdrawProposal {
    return EventWithdrawProposal.decode(message.value);
  },
  toProto(message: EventWithdrawProposal): Uint8Array {
    return EventWithdrawProposal.encode(message).finish();
  },
  toProtoMsg(message: EventWithdrawProposal): EventWithdrawProposalProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventWithdrawProposal',
      value: EventWithdrawProposal.encode(message).finish(),
    };
  },
};
function createBaseEventVote(): EventVote {
  return {
    proposalId: BigInt(0),
  };
}
/**
 * EventVote is an event emitted when a voter votes on a proposal.
 * @name EventVote
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventVote
 */
export const EventVote = {
  typeUrl: '/cosmos.group.v1.EventVote' as const,
  aminoType: 'cosmos-sdk/EventVote' as const,
  is(o: any): o is EventVote {
    return (
      o &&
      (o.$typeUrl === EventVote.typeUrl || typeof o.proposalId === 'bigint')
    );
  },
  isSDK(o: any): o is EventVoteSDKType {
    return (
      o &&
      (o.$typeUrl === EventVote.typeUrl || typeof o.proposal_id === 'bigint')
    );
  },
  encode(
    message: EventVote,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventVote {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventVote();
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
  fromJSON(object: any): EventVote {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventVote): JsonSafe<EventVote> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventVote>): EventVote {
    const message = createBaseEventVote();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventVoteProtoMsg): EventVote {
    return EventVote.decode(message.value);
  },
  toProto(message: EventVote): Uint8Array {
    return EventVote.encode(message).finish();
  },
  toProtoMsg(message: EventVote): EventVoteProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventVote',
      value: EventVote.encode(message).finish(),
    };
  },
};
function createBaseEventExec(): EventExec {
  return {
    proposalId: BigInt(0),
    result: 0,
    logs: '',
  };
}
/**
 * EventExec is an event emitted when a proposal is executed.
 * @name EventExec
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventExec
 */
export const EventExec = {
  typeUrl: '/cosmos.group.v1.EventExec' as const,
  aminoType: 'cosmos-sdk/EventExec' as const,
  is(o: any): o is EventExec {
    return (
      o &&
      (o.$typeUrl === EventExec.typeUrl ||
        (typeof o.proposalId === 'bigint' &&
          isSet(o.result) &&
          typeof o.logs === 'string'))
    );
  },
  isSDK(o: any): o is EventExecSDKType {
    return (
      o &&
      (o.$typeUrl === EventExec.typeUrl ||
        (typeof o.proposal_id === 'bigint' &&
          isSet(o.result) &&
          typeof o.logs === 'string'))
    );
  },
  encode(
    message: EventExec,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.result !== 0) {
      writer.uint32(16).int32(message.result);
    }
    if (message.logs !== '') {
      writer.uint32(26).string(message.logs);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventExec {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventExec();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.result = reader.int32() as any;
          break;
        case 3:
          message.logs = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventExec {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      result: isSet(object.result)
        ? proposalExecutorResultFromJSON(object.result)
        : -1,
      logs: isSet(object.logs) ? String(object.logs) : '',
    };
  },
  toJSON(message: EventExec): JsonSafe<EventExec> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.result !== undefined &&
      (obj.result = proposalExecutorResultToJSON(message.result));
    message.logs !== undefined && (obj.logs = message.logs);
    return obj;
  },
  fromPartial(object: Partial<EventExec>): EventExec {
    const message = createBaseEventExec();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.result = object.result ?? 0;
    message.logs = object.logs ?? '';
    return message;
  },
  fromProtoMsg(message: EventExecProtoMsg): EventExec {
    return EventExec.decode(message.value);
  },
  toProto(message: EventExec): Uint8Array {
    return EventExec.encode(message).finish();
  },
  toProtoMsg(message: EventExec): EventExecProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventExec',
      value: EventExec.encode(message).finish(),
    };
  },
};
function createBaseEventLeaveGroup(): EventLeaveGroup {
  return {
    groupId: BigInt(0),
    address: '',
  };
}
/**
 * EventLeaveGroup is an event emitted when group member leaves the group.
 * @name EventLeaveGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventLeaveGroup
 */
export const EventLeaveGroup = {
  typeUrl: '/cosmos.group.v1.EventLeaveGroup' as const,
  aminoType: 'cosmos-sdk/EventLeaveGroup' as const,
  is(o: any): o is EventLeaveGroup {
    return (
      o &&
      (o.$typeUrl === EventLeaveGroup.typeUrl ||
        (typeof o.groupId === 'bigint' && typeof o.address === 'string'))
    );
  },
  isSDK(o: any): o is EventLeaveGroupSDKType {
    return (
      o &&
      (o.$typeUrl === EventLeaveGroup.typeUrl ||
        (typeof o.group_id === 'bigint' && typeof o.address === 'string'))
    );
  },
  encode(
    message: EventLeaveGroup,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    if (message.address !== '') {
      writer.uint32(18).string(message.address);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventLeaveGroup {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventLeaveGroup();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupId = reader.uint64();
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
  fromJSON(object: any): EventLeaveGroup {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(message: EventLeaveGroup): JsonSafe<EventLeaveGroup> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(object: Partial<EventLeaveGroup>): EventLeaveGroup {
    const message = createBaseEventLeaveGroup();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(message: EventLeaveGroupProtoMsg): EventLeaveGroup {
    return EventLeaveGroup.decode(message.value);
  },
  toProto(message: EventLeaveGroup): Uint8Array {
    return EventLeaveGroup.encode(message).finish();
  },
  toProtoMsg(message: EventLeaveGroup): EventLeaveGroupProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventLeaveGroup',
      value: EventLeaveGroup.encode(message).finish(),
    };
  },
};
function createBaseEventProposalPruned(): EventProposalPruned {
  return {
    proposalId: BigInt(0),
    status: 0,
    tallyResult: undefined,
  };
}
/**
 * EventProposalPruned is an event emitted when a proposal is pruned.
 * @name EventProposalPruned
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventProposalPruned
 */
export const EventProposalPruned = {
  typeUrl: '/cosmos.group.v1.EventProposalPruned' as const,
  aminoType: 'cosmos-sdk/EventProposalPruned' as const,
  is(o: any): o is EventProposalPruned {
    return (
      o &&
      (o.$typeUrl === EventProposalPruned.typeUrl ||
        (typeof o.proposalId === 'bigint' && isSet(o.status)))
    );
  },
  isSDK(o: any): o is EventProposalPrunedSDKType {
    return (
      o &&
      (o.$typeUrl === EventProposalPruned.typeUrl ||
        (typeof o.proposal_id === 'bigint' && isSet(o.status)))
    );
  },
  encode(
    message: EventProposalPruned,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.status !== 0) {
      writer.uint32(16).int32(message.status);
    }
    if (message.tallyResult !== undefined) {
      TallyResult.encode(
        message.tallyResult,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EventProposalPruned {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventProposalPruned();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.status = reader.int32() as any;
          break;
        case 3:
          message.tallyResult = TallyResult.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventProposalPruned {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      status: isSet(object.status) ? proposalStatusFromJSON(object.status) : -1,
      tallyResult: isSet(object.tallyResult)
        ? TallyResult.fromJSON(object.tallyResult)
        : undefined,
    };
  },
  toJSON(message: EventProposalPruned): JsonSafe<EventProposalPruned> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.status !== undefined &&
      (obj.status = proposalStatusToJSON(message.status));
    message.tallyResult !== undefined &&
      (obj.tallyResult = message.tallyResult
        ? TallyResult.toJSON(message.tallyResult)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<EventProposalPruned>): EventProposalPruned {
    const message = createBaseEventProposalPruned();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.status = object.status ?? 0;
    message.tallyResult =
      object.tallyResult !== undefined && object.tallyResult !== null
        ? TallyResult.fromPartial(object.tallyResult)
        : undefined;
    return message;
  },
  fromProtoMsg(message: EventProposalPrunedProtoMsg): EventProposalPruned {
    return EventProposalPruned.decode(message.value);
  },
  toProto(message: EventProposalPruned): Uint8Array {
    return EventProposalPruned.encode(message).finish();
  },
  toProtoMsg(message: EventProposalPruned): EventProposalPrunedProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventProposalPruned',
      value: EventProposalPruned.encode(message).finish(),
    };
  },
};
function createBaseEventTallyError(): EventTallyError {
  return {
    proposalId: BigInt(0),
    errorMessage: '',
  };
}
/**
 * EventTallyError is an event emitted when a proposal tally failed with an error.
 * @name EventTallyError
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventTallyError
 */
export const EventTallyError = {
  typeUrl: '/cosmos.group.v1.EventTallyError' as const,
  aminoType: 'cosmos-sdk/EventTallyError' as const,
  is(o: any): o is EventTallyError {
    return (
      o &&
      (o.$typeUrl === EventTallyError.typeUrl ||
        (typeof o.proposalId === 'bigint' &&
          typeof o.errorMessage === 'string'))
    );
  },
  isSDK(o: any): o is EventTallyErrorSDKType {
    return (
      o &&
      (o.$typeUrl === EventTallyError.typeUrl ||
        (typeof o.proposal_id === 'bigint' &&
          typeof o.error_message === 'string'))
    );
  },
  encode(
    message: EventTallyError,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.errorMessage !== '') {
      writer.uint32(18).string(message.errorMessage);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventTallyError {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventTallyError();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.errorMessage = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventTallyError {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      errorMessage: isSet(object.errorMessage)
        ? String(object.errorMessage)
        : '',
    };
  },
  toJSON(message: EventTallyError): JsonSafe<EventTallyError> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.errorMessage !== undefined &&
      (obj.errorMessage = message.errorMessage);
    return obj;
  },
  fromPartial(object: Partial<EventTallyError>): EventTallyError {
    const message = createBaseEventTallyError();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.errorMessage = object.errorMessage ?? '';
    return message;
  },
  fromProtoMsg(message: EventTallyErrorProtoMsg): EventTallyError {
    return EventTallyError.decode(message.value);
  },
  toProto(message: EventTallyError): Uint8Array {
    return EventTallyError.encode(message).finish();
  },
  toProtoMsg(message: EventTallyError): EventTallyErrorProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.EventTallyError',
      value: EventTallyError.encode(message).finish(),
    };
  },
};
