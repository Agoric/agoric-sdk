import { ProposalExecutorResult, ProposalStatus, TallyResult, type TallyResultSDKType } from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
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
/**
 * EventCreateGroup is an event emitted when a group is created.
 * @name EventCreateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroup
 */
export declare const EventCreateGroup: {
    typeUrl: "/cosmos.group.v1.EventCreateGroup";
    aminoType: "cosmos-sdk/EventCreateGroup";
    is(o: any): o is EventCreateGroup;
    isSDK(o: any): o is EventCreateGroupSDKType;
    encode(message: EventCreateGroup, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventCreateGroup;
    fromJSON(object: any): EventCreateGroup;
    toJSON(message: EventCreateGroup): JsonSafe<EventCreateGroup>;
    fromPartial(object: Partial<EventCreateGroup>): EventCreateGroup;
    fromProtoMsg(message: EventCreateGroupProtoMsg): EventCreateGroup;
    toProto(message: EventCreateGroup): Uint8Array;
    toProtoMsg(message: EventCreateGroup): EventCreateGroupProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventUpdateGroup is an event emitted when a group is updated.
 * @name EventUpdateGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroup
 */
export declare const EventUpdateGroup: {
    typeUrl: "/cosmos.group.v1.EventUpdateGroup";
    aminoType: "cosmos-sdk/EventUpdateGroup";
    is(o: any): o is EventUpdateGroup;
    isSDK(o: any): o is EventUpdateGroupSDKType;
    encode(message: EventUpdateGroup, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventUpdateGroup;
    fromJSON(object: any): EventUpdateGroup;
    toJSON(message: EventUpdateGroup): JsonSafe<EventUpdateGroup>;
    fromPartial(object: Partial<EventUpdateGroup>): EventUpdateGroup;
    fromProtoMsg(message: EventUpdateGroupProtoMsg): EventUpdateGroup;
    toProto(message: EventUpdateGroup): Uint8Array;
    toProtoMsg(message: EventUpdateGroup): EventUpdateGroupProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventCreateGroupPolicy is an event emitted when a group policy is created.
 * @name EventCreateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventCreateGroupPolicy
 */
export declare const EventCreateGroupPolicy: {
    typeUrl: "/cosmos.group.v1.EventCreateGroupPolicy";
    aminoType: "cosmos-sdk/EventCreateGroupPolicy";
    is(o: any): o is EventCreateGroupPolicy;
    isSDK(o: any): o is EventCreateGroupPolicySDKType;
    encode(message: EventCreateGroupPolicy, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventCreateGroupPolicy;
    fromJSON(object: any): EventCreateGroupPolicy;
    toJSON(message: EventCreateGroupPolicy): JsonSafe<EventCreateGroupPolicy>;
    fromPartial(object: Partial<EventCreateGroupPolicy>): EventCreateGroupPolicy;
    fromProtoMsg(message: EventCreateGroupPolicyProtoMsg): EventCreateGroupPolicy;
    toProto(message: EventCreateGroupPolicy): Uint8Array;
    toProtoMsg(message: EventCreateGroupPolicy): EventCreateGroupPolicyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventUpdateGroupPolicy is an event emitted when a group policy is updated.
 * @name EventUpdateGroupPolicy
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventUpdateGroupPolicy
 */
export declare const EventUpdateGroupPolicy: {
    typeUrl: "/cosmos.group.v1.EventUpdateGroupPolicy";
    aminoType: "cosmos-sdk/EventUpdateGroupPolicy";
    is(o: any): o is EventUpdateGroupPolicy;
    isSDK(o: any): o is EventUpdateGroupPolicySDKType;
    encode(message: EventUpdateGroupPolicy, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventUpdateGroupPolicy;
    fromJSON(object: any): EventUpdateGroupPolicy;
    toJSON(message: EventUpdateGroupPolicy): JsonSafe<EventUpdateGroupPolicy>;
    fromPartial(object: Partial<EventUpdateGroupPolicy>): EventUpdateGroupPolicy;
    fromProtoMsg(message: EventUpdateGroupPolicyProtoMsg): EventUpdateGroupPolicy;
    toProto(message: EventUpdateGroupPolicy): Uint8Array;
    toProtoMsg(message: EventUpdateGroupPolicy): EventUpdateGroupPolicyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventSubmitProposal is an event emitted when a proposal is created.
 * @name EventSubmitProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventSubmitProposal
 */
export declare const EventSubmitProposal: {
    typeUrl: "/cosmos.group.v1.EventSubmitProposal";
    aminoType: "cosmos-sdk/EventSubmitProposal";
    is(o: any): o is EventSubmitProposal;
    isSDK(o: any): o is EventSubmitProposalSDKType;
    encode(message: EventSubmitProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventSubmitProposal;
    fromJSON(object: any): EventSubmitProposal;
    toJSON(message: EventSubmitProposal): JsonSafe<EventSubmitProposal>;
    fromPartial(object: Partial<EventSubmitProposal>): EventSubmitProposal;
    fromProtoMsg(message: EventSubmitProposalProtoMsg): EventSubmitProposal;
    toProto(message: EventSubmitProposal): Uint8Array;
    toProtoMsg(message: EventSubmitProposal): EventSubmitProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventWithdrawProposal is an event emitted when a proposal is withdrawn.
 * @name EventWithdrawProposal
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventWithdrawProposal
 */
export declare const EventWithdrawProposal: {
    typeUrl: "/cosmos.group.v1.EventWithdrawProposal";
    aminoType: "cosmos-sdk/EventWithdrawProposal";
    is(o: any): o is EventWithdrawProposal;
    isSDK(o: any): o is EventWithdrawProposalSDKType;
    encode(message: EventWithdrawProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventWithdrawProposal;
    fromJSON(object: any): EventWithdrawProposal;
    toJSON(message: EventWithdrawProposal): JsonSafe<EventWithdrawProposal>;
    fromPartial(object: Partial<EventWithdrawProposal>): EventWithdrawProposal;
    fromProtoMsg(message: EventWithdrawProposalProtoMsg): EventWithdrawProposal;
    toProto(message: EventWithdrawProposal): Uint8Array;
    toProtoMsg(message: EventWithdrawProposal): EventWithdrawProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventVote is an event emitted when a voter votes on a proposal.
 * @name EventVote
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventVote
 */
export declare const EventVote: {
    typeUrl: "/cosmos.group.v1.EventVote";
    aminoType: "cosmos-sdk/EventVote";
    is(o: any): o is EventVote;
    isSDK(o: any): o is EventVoteSDKType;
    encode(message: EventVote, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventVote;
    fromJSON(object: any): EventVote;
    toJSON(message: EventVote): JsonSafe<EventVote>;
    fromPartial(object: Partial<EventVote>): EventVote;
    fromProtoMsg(message: EventVoteProtoMsg): EventVote;
    toProto(message: EventVote): Uint8Array;
    toProtoMsg(message: EventVote): EventVoteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventExec is an event emitted when a proposal is executed.
 * @name EventExec
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventExec
 */
export declare const EventExec: {
    typeUrl: "/cosmos.group.v1.EventExec";
    aminoType: "cosmos-sdk/EventExec";
    is(o: any): o is EventExec;
    isSDK(o: any): o is EventExecSDKType;
    encode(message: EventExec, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventExec;
    fromJSON(object: any): EventExec;
    toJSON(message: EventExec): JsonSafe<EventExec>;
    fromPartial(object: Partial<EventExec>): EventExec;
    fromProtoMsg(message: EventExecProtoMsg): EventExec;
    toProto(message: EventExec): Uint8Array;
    toProtoMsg(message: EventExec): EventExecProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventLeaveGroup is an event emitted when group member leaves the group.
 * @name EventLeaveGroup
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventLeaveGroup
 */
export declare const EventLeaveGroup: {
    typeUrl: "/cosmos.group.v1.EventLeaveGroup";
    aminoType: "cosmos-sdk/EventLeaveGroup";
    is(o: any): o is EventLeaveGroup;
    isSDK(o: any): o is EventLeaveGroupSDKType;
    encode(message: EventLeaveGroup, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventLeaveGroup;
    fromJSON(object: any): EventLeaveGroup;
    toJSON(message: EventLeaveGroup): JsonSafe<EventLeaveGroup>;
    fromPartial(object: Partial<EventLeaveGroup>): EventLeaveGroup;
    fromProtoMsg(message: EventLeaveGroupProtoMsg): EventLeaveGroup;
    toProto(message: EventLeaveGroup): Uint8Array;
    toProtoMsg(message: EventLeaveGroup): EventLeaveGroupProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventProposalPruned is an event emitted when a proposal is pruned.
 * @name EventProposalPruned
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventProposalPruned
 */
export declare const EventProposalPruned: {
    typeUrl: "/cosmos.group.v1.EventProposalPruned";
    aminoType: "cosmos-sdk/EventProposalPruned";
    is(o: any): o is EventProposalPruned;
    isSDK(o: any): o is EventProposalPrunedSDKType;
    encode(message: EventProposalPruned, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventProposalPruned;
    fromJSON(object: any): EventProposalPruned;
    toJSON(message: EventProposalPruned): JsonSafe<EventProposalPruned>;
    fromPartial(object: Partial<EventProposalPruned>): EventProposalPruned;
    fromProtoMsg(message: EventProposalPrunedProtoMsg): EventProposalPruned;
    toProto(message: EventProposalPruned): Uint8Array;
    toProtoMsg(message: EventProposalPruned): EventProposalPrunedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventTallyError is an event emitted when a proposal tally failed with an error.
 * @name EventTallyError
 * @package cosmos.group.v1
 * @see proto type: cosmos.group.v1.EventTallyError
 */
export declare const EventTallyError: {
    typeUrl: "/cosmos.group.v1.EventTallyError";
    aminoType: "cosmos-sdk/EventTallyError";
    is(o: any): o is EventTallyError;
    isSDK(o: any): o is EventTallyErrorSDKType;
    encode(message: EventTallyError, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventTallyError;
    fromJSON(object: any): EventTallyError;
    toJSON(message: EventTallyError): JsonSafe<EventTallyError>;
    fromPartial(object: Partial<EventTallyError>): EventTallyError;
    fromProtoMsg(message: EventTallyErrorProtoMsg): EventTallyError;
    toProto(message: EventTallyError): Uint8Array;
    toProtoMsg(message: EventTallyError): EventTallyErrorProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=events.d.ts.map