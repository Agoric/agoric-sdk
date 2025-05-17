//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../base/query/v1beta1/pagination.js';
import {
  GroupInfo,
  type GroupInfoSDKType,
  GroupPolicyInfo,
  type GroupPolicyInfoSDKType,
  GroupMember,
  type GroupMemberSDKType,
  Proposal,
  type ProposalSDKType,
  Vote,
  type VoteSDKType,
  TallyResult,
  type TallyResultSDKType,
} from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** QueryGroupInfoRequest is the Query/GroupInfo request type. */
export interface QueryGroupInfoRequest {
  /** group_id is the unique ID of the group. */
  groupId: bigint;
}
export interface QueryGroupInfoRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupInfoRequest';
  value: Uint8Array;
}
/** QueryGroupInfoRequest is the Query/GroupInfo request type. */
export interface QueryGroupInfoRequestSDKType {
  group_id: bigint;
}
/** QueryGroupInfoResponse is the Query/GroupInfo response type. */
export interface QueryGroupInfoResponse {
  /** info is the GroupInfo for the group. */
  info?: GroupInfo;
}
export interface QueryGroupInfoResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupInfoResponse';
  value: Uint8Array;
}
/** QueryGroupInfoResponse is the Query/GroupInfo response type. */
export interface QueryGroupInfoResponseSDKType {
  info?: GroupInfoSDKType;
}
/** QueryGroupPolicyInfoRequest is the Query/GroupPolicyInfo request type. */
export interface QueryGroupPolicyInfoRequest {
  /** address is the account address of the group policy. */
  address: string;
}
export interface QueryGroupPolicyInfoRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupPolicyInfoRequest';
  value: Uint8Array;
}
/** QueryGroupPolicyInfoRequest is the Query/GroupPolicyInfo request type. */
export interface QueryGroupPolicyInfoRequestSDKType {
  address: string;
}
/** QueryGroupPolicyInfoResponse is the Query/GroupPolicyInfo response type. */
export interface QueryGroupPolicyInfoResponse {
  /** info is the GroupPolicyInfo for the group policy. */
  info?: GroupPolicyInfo;
}
export interface QueryGroupPolicyInfoResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupPolicyInfoResponse';
  value: Uint8Array;
}
/** QueryGroupPolicyInfoResponse is the Query/GroupPolicyInfo response type. */
export interface QueryGroupPolicyInfoResponseSDKType {
  info?: GroupPolicyInfoSDKType;
}
/** QueryGroupMembersRequest is the Query/GroupMembers request type. */
export interface QueryGroupMembersRequest {
  /** group_id is the unique ID of the group. */
  groupId: bigint;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryGroupMembersRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupMembersRequest';
  value: Uint8Array;
}
/** QueryGroupMembersRequest is the Query/GroupMembers request type. */
export interface QueryGroupMembersRequestSDKType {
  group_id: bigint;
  pagination?: PageRequestSDKType;
}
/** QueryGroupMembersResponse is the Query/GroupMembersResponse response type. */
export interface QueryGroupMembersResponse {
  /** members are the members of the group with given group_id. */
  members: GroupMember[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryGroupMembersResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupMembersResponse';
  value: Uint8Array;
}
/** QueryGroupMembersResponse is the Query/GroupMembersResponse response type. */
export interface QueryGroupMembersResponseSDKType {
  members: GroupMemberSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryGroupsByAdminRequest is the Query/GroupsByAdmin request type. */
export interface QueryGroupsByAdminRequest {
  /** admin is the account address of a group's admin. */
  admin: string;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryGroupsByAdminRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupsByAdminRequest';
  value: Uint8Array;
}
/** QueryGroupsByAdminRequest is the Query/GroupsByAdmin request type. */
export interface QueryGroupsByAdminRequestSDKType {
  admin: string;
  pagination?: PageRequestSDKType;
}
/** QueryGroupsByAdminResponse is the Query/GroupsByAdminResponse response type. */
export interface QueryGroupsByAdminResponse {
  /** groups are the groups info with the provided admin. */
  groups: GroupInfo[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryGroupsByAdminResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupsByAdminResponse';
  value: Uint8Array;
}
/** QueryGroupsByAdminResponse is the Query/GroupsByAdminResponse response type. */
export interface QueryGroupsByAdminResponseSDKType {
  groups: GroupInfoSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryGroupPoliciesByGroupRequest is the Query/GroupPoliciesByGroup request type. */
export interface QueryGroupPoliciesByGroupRequest {
  /** group_id is the unique ID of the group policy's group. */
  groupId: bigint;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryGroupPoliciesByGroupRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByGroupRequest';
  value: Uint8Array;
}
/** QueryGroupPoliciesByGroupRequest is the Query/GroupPoliciesByGroup request type. */
export interface QueryGroupPoliciesByGroupRequestSDKType {
  group_id: bigint;
  pagination?: PageRequestSDKType;
}
/** QueryGroupPoliciesByGroupResponse is the Query/GroupPoliciesByGroup response type. */
export interface QueryGroupPoliciesByGroupResponse {
  /** group_policies are the group policies info associated with the provided group. */
  groupPolicies: GroupPolicyInfo[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryGroupPoliciesByGroupResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByGroupResponse';
  value: Uint8Array;
}
/** QueryGroupPoliciesByGroupResponse is the Query/GroupPoliciesByGroup response type. */
export interface QueryGroupPoliciesByGroupResponseSDKType {
  group_policies: GroupPolicyInfoSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryGroupPoliciesByAdminRequest is the Query/GroupPoliciesByAdmin request type. */
export interface QueryGroupPoliciesByAdminRequest {
  /** admin is the admin address of the group policy. */
  admin: string;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryGroupPoliciesByAdminRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByAdminRequest';
  value: Uint8Array;
}
/** QueryGroupPoliciesByAdminRequest is the Query/GroupPoliciesByAdmin request type. */
export interface QueryGroupPoliciesByAdminRequestSDKType {
  admin: string;
  pagination?: PageRequestSDKType;
}
/** QueryGroupPoliciesByAdminResponse is the Query/GroupPoliciesByAdmin response type. */
export interface QueryGroupPoliciesByAdminResponse {
  /** group_policies are the group policies info with provided admin. */
  groupPolicies: GroupPolicyInfo[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryGroupPoliciesByAdminResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByAdminResponse';
  value: Uint8Array;
}
/** QueryGroupPoliciesByAdminResponse is the Query/GroupPoliciesByAdmin response type. */
export interface QueryGroupPoliciesByAdminResponseSDKType {
  group_policies: GroupPolicyInfoSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryProposalRequest is the Query/Proposal request type. */
export interface QueryProposalRequest {
  /** proposal_id is the unique ID of a proposal. */
  proposalId: bigint;
}
export interface QueryProposalRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryProposalRequest';
  value: Uint8Array;
}
/** QueryProposalRequest is the Query/Proposal request type. */
export interface QueryProposalRequestSDKType {
  proposal_id: bigint;
}
/** QueryProposalResponse is the Query/Proposal response type. */
export interface QueryProposalResponse {
  /** proposal is the proposal info. */
  proposal?: Proposal;
}
export interface QueryProposalResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryProposalResponse';
  value: Uint8Array;
}
/** QueryProposalResponse is the Query/Proposal response type. */
export interface QueryProposalResponseSDKType {
  proposal?: ProposalSDKType;
}
/** QueryProposalsByGroupPolicyRequest is the Query/ProposalByGroupPolicy request type. */
export interface QueryProposalsByGroupPolicyRequest {
  /** address is the account address of the group policy related to proposals. */
  address: string;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryProposalsByGroupPolicyRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryProposalsByGroupPolicyRequest';
  value: Uint8Array;
}
/** QueryProposalsByGroupPolicyRequest is the Query/ProposalByGroupPolicy request type. */
export interface QueryProposalsByGroupPolicyRequestSDKType {
  address: string;
  pagination?: PageRequestSDKType;
}
/** QueryProposalsByGroupPolicyResponse is the Query/ProposalByGroupPolicy response type. */
export interface QueryProposalsByGroupPolicyResponse {
  /** proposals are the proposals with given group policy. */
  proposals: Proposal[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryProposalsByGroupPolicyResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryProposalsByGroupPolicyResponse';
  value: Uint8Array;
}
/** QueryProposalsByGroupPolicyResponse is the Query/ProposalByGroupPolicy response type. */
export interface QueryProposalsByGroupPolicyResponseSDKType {
  proposals: ProposalSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryVoteByProposalVoterRequest is the Query/VoteByProposalVoter request type. */
export interface QueryVoteByProposalVoterRequest {
  /** proposal_id is the unique ID of a proposal. */
  proposalId: bigint;
  /** voter is a proposal voter account address. */
  voter: string;
}
export interface QueryVoteByProposalVoterRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryVoteByProposalVoterRequest';
  value: Uint8Array;
}
/** QueryVoteByProposalVoterRequest is the Query/VoteByProposalVoter request type. */
export interface QueryVoteByProposalVoterRequestSDKType {
  proposal_id: bigint;
  voter: string;
}
/** QueryVoteByProposalVoterResponse is the Query/VoteByProposalVoter response type. */
export interface QueryVoteByProposalVoterResponse {
  /** vote is the vote with given proposal_id and voter. */
  vote?: Vote;
}
export interface QueryVoteByProposalVoterResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryVoteByProposalVoterResponse';
  value: Uint8Array;
}
/** QueryVoteByProposalVoterResponse is the Query/VoteByProposalVoter response type. */
export interface QueryVoteByProposalVoterResponseSDKType {
  vote?: VoteSDKType;
}
/** QueryVotesByProposalRequest is the Query/VotesByProposal request type. */
export interface QueryVotesByProposalRequest {
  /** proposal_id is the unique ID of a proposal. */
  proposalId: bigint;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryVotesByProposalRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryVotesByProposalRequest';
  value: Uint8Array;
}
/** QueryVotesByProposalRequest is the Query/VotesByProposal request type. */
export interface QueryVotesByProposalRequestSDKType {
  proposal_id: bigint;
  pagination?: PageRequestSDKType;
}
/** QueryVotesByProposalResponse is the Query/VotesByProposal response type. */
export interface QueryVotesByProposalResponse {
  /** votes are the list of votes for given proposal_id. */
  votes: Vote[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryVotesByProposalResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryVotesByProposalResponse';
  value: Uint8Array;
}
/** QueryVotesByProposalResponse is the Query/VotesByProposal response type. */
export interface QueryVotesByProposalResponseSDKType {
  votes: VoteSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryVotesByVoterRequest is the Query/VotesByVoter request type. */
export interface QueryVotesByVoterRequest {
  /** voter is a proposal voter account address. */
  voter: string;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryVotesByVoterRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryVotesByVoterRequest';
  value: Uint8Array;
}
/** QueryVotesByVoterRequest is the Query/VotesByVoter request type. */
export interface QueryVotesByVoterRequestSDKType {
  voter: string;
  pagination?: PageRequestSDKType;
}
/** QueryVotesByVoterResponse is the Query/VotesByVoter response type. */
export interface QueryVotesByVoterResponse {
  /** votes are the list of votes by given voter. */
  votes: Vote[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryVotesByVoterResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryVotesByVoterResponse';
  value: Uint8Array;
}
/** QueryVotesByVoterResponse is the Query/VotesByVoter response type. */
export interface QueryVotesByVoterResponseSDKType {
  votes: VoteSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryGroupsByMemberRequest is the Query/GroupsByMember request type. */
export interface QueryGroupsByMemberRequest {
  /** address is the group member address. */
  address: string;
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryGroupsByMemberRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupsByMemberRequest';
  value: Uint8Array;
}
/** QueryGroupsByMemberRequest is the Query/GroupsByMember request type. */
export interface QueryGroupsByMemberRequestSDKType {
  address: string;
  pagination?: PageRequestSDKType;
}
/** QueryGroupsByMemberResponse is the Query/GroupsByMember response type. */
export interface QueryGroupsByMemberResponse {
  /** groups are the groups info with the provided group member. */
  groups: GroupInfo[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryGroupsByMemberResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupsByMemberResponse';
  value: Uint8Array;
}
/** QueryGroupsByMemberResponse is the Query/GroupsByMember response type. */
export interface QueryGroupsByMemberResponseSDKType {
  groups: GroupInfoSDKType[];
  pagination?: PageResponseSDKType;
}
/** QueryTallyResultRequest is the Query/TallyResult request type. */
export interface QueryTallyResultRequest {
  /** proposal_id is the unique id of a proposal. */
  proposalId: bigint;
}
export interface QueryTallyResultRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryTallyResultRequest';
  value: Uint8Array;
}
/** QueryTallyResultRequest is the Query/TallyResult request type. */
export interface QueryTallyResultRequestSDKType {
  proposal_id: bigint;
}
/** QueryTallyResultResponse is the Query/TallyResult response type. */
export interface QueryTallyResultResponse {
  /** tally defines the requested tally. */
  tally: TallyResult;
}
export interface QueryTallyResultResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryTallyResultResponse';
  value: Uint8Array;
}
/** QueryTallyResultResponse is the Query/TallyResult response type. */
export interface QueryTallyResultResponseSDKType {
  tally: TallyResultSDKType;
}
/**
 * QueryGroupsRequest is the Query/Groups request type.
 *
 * Since: cosmos-sdk 0.47.1
 */
export interface QueryGroupsRequest {
  /** pagination defines an optional pagination for the request. */
  pagination?: PageRequest;
}
export interface QueryGroupsRequestProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupsRequest';
  value: Uint8Array;
}
/**
 * QueryGroupsRequest is the Query/Groups request type.
 *
 * Since: cosmos-sdk 0.47.1
 */
export interface QueryGroupsRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryGroupsResponse is the Query/Groups response type.
 *
 * Since: cosmos-sdk 0.47.1
 */
export interface QueryGroupsResponse {
  /** `groups` is all the groups present in state. */
  groups: GroupInfo[];
  /** pagination defines the pagination in the response. */
  pagination?: PageResponse;
}
export interface QueryGroupsResponseProtoMsg {
  typeUrl: '/cosmos.group.v1.QueryGroupsResponse';
  value: Uint8Array;
}
/**
 * QueryGroupsResponse is the Query/Groups response type.
 *
 * Since: cosmos-sdk 0.47.1
 */
export interface QueryGroupsResponseSDKType {
  groups: GroupInfoSDKType[];
  pagination?: PageResponseSDKType;
}
function createBaseQueryGroupInfoRequest(): QueryGroupInfoRequest {
  return {
    groupId: BigInt(0),
  };
}
export const QueryGroupInfoRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupInfoRequest',
  encode(
    message: QueryGroupInfoRequest,
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
  ): QueryGroupInfoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupInfoRequest();
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
  fromJSON(object: any): QueryGroupInfoRequest {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: QueryGroupInfoRequest): JsonSafe<QueryGroupInfoRequest> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<QueryGroupInfoRequest>): QueryGroupInfoRequest {
    const message = createBaseQueryGroupInfoRequest();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: QueryGroupInfoRequestProtoMsg): QueryGroupInfoRequest {
    return QueryGroupInfoRequest.decode(message.value);
  },
  toProto(message: QueryGroupInfoRequest): Uint8Array {
    return QueryGroupInfoRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGroupInfoRequest): QueryGroupInfoRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupInfoRequest',
      value: QueryGroupInfoRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupInfoResponse(): QueryGroupInfoResponse {
  return {
    info: undefined,
  };
}
export const QueryGroupInfoResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupInfoResponse',
  encode(
    message: QueryGroupInfoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.info !== undefined) {
      GroupInfo.encode(message.info, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupInfoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.info = GroupInfo.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupInfoResponse {
    return {
      info: isSet(object.info) ? GroupInfo.fromJSON(object.info) : undefined,
    };
  },
  toJSON(message: QueryGroupInfoResponse): JsonSafe<QueryGroupInfoResponse> {
    const obj: any = {};
    message.info !== undefined &&
      (obj.info = message.info ? GroupInfo.toJSON(message.info) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryGroupInfoResponse>): QueryGroupInfoResponse {
    const message = createBaseQueryGroupInfoResponse();
    message.info =
      object.info !== undefined && object.info !== null
        ? GroupInfo.fromPartial(object.info)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupInfoResponseProtoMsg,
  ): QueryGroupInfoResponse {
    return QueryGroupInfoResponse.decode(message.value);
  },
  toProto(message: QueryGroupInfoResponse): Uint8Array {
    return QueryGroupInfoResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGroupInfoResponse): QueryGroupInfoResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupInfoResponse',
      value: QueryGroupInfoResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupPolicyInfoRequest(): QueryGroupPolicyInfoRequest {
  return {
    address: '',
  };
}
export const QueryGroupPolicyInfoRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupPolicyInfoRequest',
  encode(
    message: QueryGroupPolicyInfoRequest,
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
  ): QueryGroupPolicyInfoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupPolicyInfoRequest();
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
  fromJSON(object: any): QueryGroupPolicyInfoRequest {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(
    message: QueryGroupPolicyInfoRequest,
  ): JsonSafe<QueryGroupPolicyInfoRequest> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupPolicyInfoRequest>,
  ): QueryGroupPolicyInfoRequest {
    const message = createBaseQueryGroupPolicyInfoRequest();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGroupPolicyInfoRequestProtoMsg,
  ): QueryGroupPolicyInfoRequest {
    return QueryGroupPolicyInfoRequest.decode(message.value);
  },
  toProto(message: QueryGroupPolicyInfoRequest): Uint8Array {
    return QueryGroupPolicyInfoRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupPolicyInfoRequest,
  ): QueryGroupPolicyInfoRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupPolicyInfoRequest',
      value: QueryGroupPolicyInfoRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupPolicyInfoResponse(): QueryGroupPolicyInfoResponse {
  return {
    info: undefined,
  };
}
export const QueryGroupPolicyInfoResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupPolicyInfoResponse',
  encode(
    message: QueryGroupPolicyInfoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.info !== undefined) {
      GroupPolicyInfo.encode(message.info, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupPolicyInfoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupPolicyInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.info = GroupPolicyInfo.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupPolicyInfoResponse {
    return {
      info: isSet(object.info)
        ? GroupPolicyInfo.fromJSON(object.info)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupPolicyInfoResponse,
  ): JsonSafe<QueryGroupPolicyInfoResponse> {
    const obj: any = {};
    message.info !== undefined &&
      (obj.info = message.info
        ? GroupPolicyInfo.toJSON(message.info)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupPolicyInfoResponse>,
  ): QueryGroupPolicyInfoResponse {
    const message = createBaseQueryGroupPolicyInfoResponse();
    message.info =
      object.info !== undefined && object.info !== null
        ? GroupPolicyInfo.fromPartial(object.info)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupPolicyInfoResponseProtoMsg,
  ): QueryGroupPolicyInfoResponse {
    return QueryGroupPolicyInfoResponse.decode(message.value);
  },
  toProto(message: QueryGroupPolicyInfoResponse): Uint8Array {
    return QueryGroupPolicyInfoResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupPolicyInfoResponse,
  ): QueryGroupPolicyInfoResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupPolicyInfoResponse',
      value: QueryGroupPolicyInfoResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupMembersRequest(): QueryGroupMembersRequest {
  return {
    groupId: BigInt(0),
    pagination: undefined,
  };
}
export const QueryGroupMembersRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupMembersRequest',
  encode(
    message: QueryGroupMembersRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupMembersRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupMembersRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupId = reader.uint64();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupMembersRequest {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupMembersRequest,
  ): JsonSafe<QueryGroupMembersRequest> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupMembersRequest>,
  ): QueryGroupMembersRequest {
    const message = createBaseQueryGroupMembersRequest();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupMembersRequestProtoMsg,
  ): QueryGroupMembersRequest {
    return QueryGroupMembersRequest.decode(message.value);
  },
  toProto(message: QueryGroupMembersRequest): Uint8Array {
    return QueryGroupMembersRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupMembersRequest,
  ): QueryGroupMembersRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupMembersRequest',
      value: QueryGroupMembersRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupMembersResponse(): QueryGroupMembersResponse {
  return {
    members: [],
    pagination: undefined,
  };
}
export const QueryGroupMembersResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupMembersResponse',
  encode(
    message: QueryGroupMembersResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.members) {
      GroupMember.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupMembersResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupMembersResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.members.push(GroupMember.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupMembersResponse {
    return {
      members: Array.isArray(object?.members)
        ? object.members.map((e: any) => GroupMember.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupMembersResponse,
  ): JsonSafe<QueryGroupMembersResponse> {
    const obj: any = {};
    if (message.members) {
      obj.members = message.members.map(e =>
        e ? GroupMember.toJSON(e) : undefined,
      );
    } else {
      obj.members = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupMembersResponse>,
  ): QueryGroupMembersResponse {
    const message = createBaseQueryGroupMembersResponse();
    message.members =
      object.members?.map(e => GroupMember.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupMembersResponseProtoMsg,
  ): QueryGroupMembersResponse {
    return QueryGroupMembersResponse.decode(message.value);
  },
  toProto(message: QueryGroupMembersResponse): Uint8Array {
    return QueryGroupMembersResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupMembersResponse,
  ): QueryGroupMembersResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupMembersResponse',
      value: QueryGroupMembersResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupsByAdminRequest(): QueryGroupsByAdminRequest {
  return {
    admin: '',
    pagination: undefined,
  };
}
export const QueryGroupsByAdminRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupsByAdminRequest',
  encode(
    message: QueryGroupsByAdminRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupsByAdminRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupsByAdminRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupsByAdminRequest {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupsByAdminRequest,
  ): JsonSafe<QueryGroupsByAdminRequest> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupsByAdminRequest>,
  ): QueryGroupsByAdminRequest {
    const message = createBaseQueryGroupsByAdminRequest();
    message.admin = object.admin ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupsByAdminRequestProtoMsg,
  ): QueryGroupsByAdminRequest {
    return QueryGroupsByAdminRequest.decode(message.value);
  },
  toProto(message: QueryGroupsByAdminRequest): Uint8Array {
    return QueryGroupsByAdminRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupsByAdminRequest,
  ): QueryGroupsByAdminRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupsByAdminRequest',
      value: QueryGroupsByAdminRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupsByAdminResponse(): QueryGroupsByAdminResponse {
  return {
    groups: [],
    pagination: undefined,
  };
}
export const QueryGroupsByAdminResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupsByAdminResponse',
  encode(
    message: QueryGroupsByAdminResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.groups) {
      GroupInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupsByAdminResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupsByAdminResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groups.push(GroupInfo.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupsByAdminResponse {
    return {
      groups: Array.isArray(object?.groups)
        ? object.groups.map((e: any) => GroupInfo.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupsByAdminResponse,
  ): JsonSafe<QueryGroupsByAdminResponse> {
    const obj: any = {};
    if (message.groups) {
      obj.groups = message.groups.map(e =>
        e ? GroupInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groups = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupsByAdminResponse>,
  ): QueryGroupsByAdminResponse {
    const message = createBaseQueryGroupsByAdminResponse();
    message.groups = object.groups?.map(e => GroupInfo.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupsByAdminResponseProtoMsg,
  ): QueryGroupsByAdminResponse {
    return QueryGroupsByAdminResponse.decode(message.value);
  },
  toProto(message: QueryGroupsByAdminResponse): Uint8Array {
    return QueryGroupsByAdminResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupsByAdminResponse,
  ): QueryGroupsByAdminResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupsByAdminResponse',
      value: QueryGroupsByAdminResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupPoliciesByGroupRequest(): QueryGroupPoliciesByGroupRequest {
  return {
    groupId: BigInt(0),
    pagination: undefined,
  };
}
export const QueryGroupPoliciesByGroupRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByGroupRequest',
  encode(
    message: QueryGroupPoliciesByGroupRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.groupId !== BigInt(0)) {
      writer.uint32(8).uint64(message.groupId);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupPoliciesByGroupRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupPoliciesByGroupRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupId = reader.uint64();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupPoliciesByGroupRequest {
    return {
      groupId: isSet(object.groupId)
        ? BigInt(object.groupId.toString())
        : BigInt(0),
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupPoliciesByGroupRequest,
  ): JsonSafe<QueryGroupPoliciesByGroupRequest> {
    const obj: any = {};
    message.groupId !== undefined &&
      (obj.groupId = (message.groupId || BigInt(0)).toString());
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupPoliciesByGroupRequest>,
  ): QueryGroupPoliciesByGroupRequest {
    const message = createBaseQueryGroupPoliciesByGroupRequest();
    message.groupId =
      object.groupId !== undefined && object.groupId !== null
        ? BigInt(object.groupId.toString())
        : BigInt(0);
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupPoliciesByGroupRequestProtoMsg,
  ): QueryGroupPoliciesByGroupRequest {
    return QueryGroupPoliciesByGroupRequest.decode(message.value);
  },
  toProto(message: QueryGroupPoliciesByGroupRequest): Uint8Array {
    return QueryGroupPoliciesByGroupRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupPoliciesByGroupRequest,
  ): QueryGroupPoliciesByGroupRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByGroupRequest',
      value: QueryGroupPoliciesByGroupRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupPoliciesByGroupResponse(): QueryGroupPoliciesByGroupResponse {
  return {
    groupPolicies: [],
    pagination: undefined,
  };
}
export const QueryGroupPoliciesByGroupResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByGroupResponse',
  encode(
    message: QueryGroupPoliciesByGroupResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.groupPolicies) {
      GroupPolicyInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupPoliciesByGroupResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupPoliciesByGroupResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupPolicies.push(
            GroupPolicyInfo.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupPoliciesByGroupResponse {
    return {
      groupPolicies: Array.isArray(object?.groupPolicies)
        ? object.groupPolicies.map((e: any) => GroupPolicyInfo.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupPoliciesByGroupResponse,
  ): JsonSafe<QueryGroupPoliciesByGroupResponse> {
    const obj: any = {};
    if (message.groupPolicies) {
      obj.groupPolicies = message.groupPolicies.map(e =>
        e ? GroupPolicyInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groupPolicies = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupPoliciesByGroupResponse>,
  ): QueryGroupPoliciesByGroupResponse {
    const message = createBaseQueryGroupPoliciesByGroupResponse();
    message.groupPolicies =
      object.groupPolicies?.map(e => GroupPolicyInfo.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupPoliciesByGroupResponseProtoMsg,
  ): QueryGroupPoliciesByGroupResponse {
    return QueryGroupPoliciesByGroupResponse.decode(message.value);
  },
  toProto(message: QueryGroupPoliciesByGroupResponse): Uint8Array {
    return QueryGroupPoliciesByGroupResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupPoliciesByGroupResponse,
  ): QueryGroupPoliciesByGroupResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByGroupResponse',
      value: QueryGroupPoliciesByGroupResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupPoliciesByAdminRequest(): QueryGroupPoliciesByAdminRequest {
  return {
    admin: '',
    pagination: undefined,
  };
}
export const QueryGroupPoliciesByAdminRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByAdminRequest',
  encode(
    message: QueryGroupPoliciesByAdminRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupPoliciesByAdminRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupPoliciesByAdminRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupPoliciesByAdminRequest {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupPoliciesByAdminRequest,
  ): JsonSafe<QueryGroupPoliciesByAdminRequest> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupPoliciesByAdminRequest>,
  ): QueryGroupPoliciesByAdminRequest {
    const message = createBaseQueryGroupPoliciesByAdminRequest();
    message.admin = object.admin ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupPoliciesByAdminRequestProtoMsg,
  ): QueryGroupPoliciesByAdminRequest {
    return QueryGroupPoliciesByAdminRequest.decode(message.value);
  },
  toProto(message: QueryGroupPoliciesByAdminRequest): Uint8Array {
    return QueryGroupPoliciesByAdminRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupPoliciesByAdminRequest,
  ): QueryGroupPoliciesByAdminRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByAdminRequest',
      value: QueryGroupPoliciesByAdminRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupPoliciesByAdminResponse(): QueryGroupPoliciesByAdminResponse {
  return {
    groupPolicies: [],
    pagination: undefined,
  };
}
export const QueryGroupPoliciesByAdminResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByAdminResponse',
  encode(
    message: QueryGroupPoliciesByAdminResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.groupPolicies) {
      GroupPolicyInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupPoliciesByAdminResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupPoliciesByAdminResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groupPolicies.push(
            GroupPolicyInfo.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupPoliciesByAdminResponse {
    return {
      groupPolicies: Array.isArray(object?.groupPolicies)
        ? object.groupPolicies.map((e: any) => GroupPolicyInfo.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupPoliciesByAdminResponse,
  ): JsonSafe<QueryGroupPoliciesByAdminResponse> {
    const obj: any = {};
    if (message.groupPolicies) {
      obj.groupPolicies = message.groupPolicies.map(e =>
        e ? GroupPolicyInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groupPolicies = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupPoliciesByAdminResponse>,
  ): QueryGroupPoliciesByAdminResponse {
    const message = createBaseQueryGroupPoliciesByAdminResponse();
    message.groupPolicies =
      object.groupPolicies?.map(e => GroupPolicyInfo.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupPoliciesByAdminResponseProtoMsg,
  ): QueryGroupPoliciesByAdminResponse {
    return QueryGroupPoliciesByAdminResponse.decode(message.value);
  },
  toProto(message: QueryGroupPoliciesByAdminResponse): Uint8Array {
    return QueryGroupPoliciesByAdminResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupPoliciesByAdminResponse,
  ): QueryGroupPoliciesByAdminResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupPoliciesByAdminResponse',
      value: QueryGroupPoliciesByAdminResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryProposalRequest(): QueryProposalRequest {
  return {
    proposalId: BigInt(0),
  };
}
export const QueryProposalRequest = {
  typeUrl: '/cosmos.group.v1.QueryProposalRequest',
  encode(
    message: QueryProposalRequest,
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
  ): QueryProposalRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryProposalRequest();
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
  fromJSON(object: any): QueryProposalRequest {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: QueryProposalRequest): JsonSafe<QueryProposalRequest> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<QueryProposalRequest>): QueryProposalRequest {
    const message = createBaseQueryProposalRequest();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: QueryProposalRequestProtoMsg): QueryProposalRequest {
    return QueryProposalRequest.decode(message.value);
  },
  toProto(message: QueryProposalRequest): Uint8Array {
    return QueryProposalRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryProposalRequest): QueryProposalRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryProposalRequest',
      value: QueryProposalRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryProposalResponse(): QueryProposalResponse {
  return {
    proposal: undefined,
  };
}
export const QueryProposalResponse = {
  typeUrl: '/cosmos.group.v1.QueryProposalResponse',
  encode(
    message: QueryProposalResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposal !== undefined) {
      Proposal.encode(message.proposal, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryProposalResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryProposalResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposal = Proposal.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryProposalResponse {
    return {
      proposal: isSet(object.proposal)
        ? Proposal.fromJSON(object.proposal)
        : undefined,
    };
  },
  toJSON(message: QueryProposalResponse): JsonSafe<QueryProposalResponse> {
    const obj: any = {};
    message.proposal !== undefined &&
      (obj.proposal = message.proposal
        ? Proposal.toJSON(message.proposal)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryProposalResponse>): QueryProposalResponse {
    const message = createBaseQueryProposalResponse();
    message.proposal =
      object.proposal !== undefined && object.proposal !== null
        ? Proposal.fromPartial(object.proposal)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryProposalResponseProtoMsg): QueryProposalResponse {
    return QueryProposalResponse.decode(message.value);
  },
  toProto(message: QueryProposalResponse): Uint8Array {
    return QueryProposalResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryProposalResponse): QueryProposalResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryProposalResponse',
      value: QueryProposalResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryProposalsByGroupPolicyRequest(): QueryProposalsByGroupPolicyRequest {
  return {
    address: '',
    pagination: undefined,
  };
}
export const QueryProposalsByGroupPolicyRequest = {
  typeUrl: '/cosmos.group.v1.QueryProposalsByGroupPolicyRequest',
  encode(
    message: QueryProposalsByGroupPolicyRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryProposalsByGroupPolicyRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryProposalsByGroupPolicyRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryProposalsByGroupPolicyRequest {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryProposalsByGroupPolicyRequest,
  ): JsonSafe<QueryProposalsByGroupPolicyRequest> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryProposalsByGroupPolicyRequest>,
  ): QueryProposalsByGroupPolicyRequest {
    const message = createBaseQueryProposalsByGroupPolicyRequest();
    message.address = object.address ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryProposalsByGroupPolicyRequestProtoMsg,
  ): QueryProposalsByGroupPolicyRequest {
    return QueryProposalsByGroupPolicyRequest.decode(message.value);
  },
  toProto(message: QueryProposalsByGroupPolicyRequest): Uint8Array {
    return QueryProposalsByGroupPolicyRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryProposalsByGroupPolicyRequest,
  ): QueryProposalsByGroupPolicyRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryProposalsByGroupPolicyRequest',
      value: QueryProposalsByGroupPolicyRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryProposalsByGroupPolicyResponse(): QueryProposalsByGroupPolicyResponse {
  return {
    proposals: [],
    pagination: undefined,
  };
}
export const QueryProposalsByGroupPolicyResponse = {
  typeUrl: '/cosmos.group.v1.QueryProposalsByGroupPolicyResponse',
  encode(
    message: QueryProposalsByGroupPolicyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.proposals) {
      Proposal.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryProposalsByGroupPolicyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryProposalsByGroupPolicyResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposals.push(Proposal.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryProposalsByGroupPolicyResponse {
    return {
      proposals: Array.isArray(object?.proposals)
        ? object.proposals.map((e: any) => Proposal.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryProposalsByGroupPolicyResponse,
  ): JsonSafe<QueryProposalsByGroupPolicyResponse> {
    const obj: any = {};
    if (message.proposals) {
      obj.proposals = message.proposals.map(e =>
        e ? Proposal.toJSON(e) : undefined,
      );
    } else {
      obj.proposals = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryProposalsByGroupPolicyResponse>,
  ): QueryProposalsByGroupPolicyResponse {
    const message = createBaseQueryProposalsByGroupPolicyResponse();
    message.proposals =
      object.proposals?.map(e => Proposal.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryProposalsByGroupPolicyResponseProtoMsg,
  ): QueryProposalsByGroupPolicyResponse {
    return QueryProposalsByGroupPolicyResponse.decode(message.value);
  },
  toProto(message: QueryProposalsByGroupPolicyResponse): Uint8Array {
    return QueryProposalsByGroupPolicyResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryProposalsByGroupPolicyResponse,
  ): QueryProposalsByGroupPolicyResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryProposalsByGroupPolicyResponse',
      value: QueryProposalsByGroupPolicyResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryVoteByProposalVoterRequest(): QueryVoteByProposalVoterRequest {
  return {
    proposalId: BigInt(0),
    voter: '',
  };
}
export const QueryVoteByProposalVoterRequest = {
  typeUrl: '/cosmos.group.v1.QueryVoteByProposalVoterRequest',
  encode(
    message: QueryVoteByProposalVoterRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.voter !== '') {
      writer.uint32(18).string(message.voter);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryVoteByProposalVoterRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryVoteByProposalVoterRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.voter = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryVoteByProposalVoterRequest {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      voter: isSet(object.voter) ? String(object.voter) : '',
    };
  },
  toJSON(
    message: QueryVoteByProposalVoterRequest,
  ): JsonSafe<QueryVoteByProposalVoterRequest> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.voter !== undefined && (obj.voter = message.voter);
    return obj;
  },
  fromPartial(
    object: Partial<QueryVoteByProposalVoterRequest>,
  ): QueryVoteByProposalVoterRequest {
    const message = createBaseQueryVoteByProposalVoterRequest();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.voter = object.voter ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryVoteByProposalVoterRequestProtoMsg,
  ): QueryVoteByProposalVoterRequest {
    return QueryVoteByProposalVoterRequest.decode(message.value);
  },
  toProto(message: QueryVoteByProposalVoterRequest): Uint8Array {
    return QueryVoteByProposalVoterRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryVoteByProposalVoterRequest,
  ): QueryVoteByProposalVoterRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryVoteByProposalVoterRequest',
      value: QueryVoteByProposalVoterRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryVoteByProposalVoterResponse(): QueryVoteByProposalVoterResponse {
  return {
    vote: undefined,
  };
}
export const QueryVoteByProposalVoterResponse = {
  typeUrl: '/cosmos.group.v1.QueryVoteByProposalVoterResponse',
  encode(
    message: QueryVoteByProposalVoterResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.vote !== undefined) {
      Vote.encode(message.vote, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryVoteByProposalVoterResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryVoteByProposalVoterResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.vote = Vote.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryVoteByProposalVoterResponse {
    return {
      vote: isSet(object.vote) ? Vote.fromJSON(object.vote) : undefined,
    };
  },
  toJSON(
    message: QueryVoteByProposalVoterResponse,
  ): JsonSafe<QueryVoteByProposalVoterResponse> {
    const obj: any = {};
    message.vote !== undefined &&
      (obj.vote = message.vote ? Vote.toJSON(message.vote) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryVoteByProposalVoterResponse>,
  ): QueryVoteByProposalVoterResponse {
    const message = createBaseQueryVoteByProposalVoterResponse();
    message.vote =
      object.vote !== undefined && object.vote !== null
        ? Vote.fromPartial(object.vote)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryVoteByProposalVoterResponseProtoMsg,
  ): QueryVoteByProposalVoterResponse {
    return QueryVoteByProposalVoterResponse.decode(message.value);
  },
  toProto(message: QueryVoteByProposalVoterResponse): Uint8Array {
    return QueryVoteByProposalVoterResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryVoteByProposalVoterResponse,
  ): QueryVoteByProposalVoterResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryVoteByProposalVoterResponse',
      value: QueryVoteByProposalVoterResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryVotesByProposalRequest(): QueryVotesByProposalRequest {
  return {
    proposalId: BigInt(0),
    pagination: undefined,
  };
}
export const QueryVotesByProposalRequest = {
  typeUrl: '/cosmos.group.v1.QueryVotesByProposalRequest',
  encode(
    message: QueryVotesByProposalRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryVotesByProposalRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryVotesByProposalRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryVotesByProposalRequest {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryVotesByProposalRequest,
  ): JsonSafe<QueryVotesByProposalRequest> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryVotesByProposalRequest>,
  ): QueryVotesByProposalRequest {
    const message = createBaseQueryVotesByProposalRequest();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryVotesByProposalRequestProtoMsg,
  ): QueryVotesByProposalRequest {
    return QueryVotesByProposalRequest.decode(message.value);
  },
  toProto(message: QueryVotesByProposalRequest): Uint8Array {
    return QueryVotesByProposalRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryVotesByProposalRequest,
  ): QueryVotesByProposalRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryVotesByProposalRequest',
      value: QueryVotesByProposalRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryVotesByProposalResponse(): QueryVotesByProposalResponse {
  return {
    votes: [],
    pagination: undefined,
  };
}
export const QueryVotesByProposalResponse = {
  typeUrl: '/cosmos.group.v1.QueryVotesByProposalResponse',
  encode(
    message: QueryVotesByProposalResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.votes) {
      Vote.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryVotesByProposalResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryVotesByProposalResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.votes.push(Vote.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryVotesByProposalResponse {
    return {
      votes: Array.isArray(object?.votes)
        ? object.votes.map((e: any) => Vote.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryVotesByProposalResponse,
  ): JsonSafe<QueryVotesByProposalResponse> {
    const obj: any = {};
    if (message.votes) {
      obj.votes = message.votes.map(e => (e ? Vote.toJSON(e) : undefined));
    } else {
      obj.votes = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryVotesByProposalResponse>,
  ): QueryVotesByProposalResponse {
    const message = createBaseQueryVotesByProposalResponse();
    message.votes = object.votes?.map(e => Vote.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryVotesByProposalResponseProtoMsg,
  ): QueryVotesByProposalResponse {
    return QueryVotesByProposalResponse.decode(message.value);
  },
  toProto(message: QueryVotesByProposalResponse): Uint8Array {
    return QueryVotesByProposalResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryVotesByProposalResponse,
  ): QueryVotesByProposalResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryVotesByProposalResponse',
      value: QueryVotesByProposalResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryVotesByVoterRequest(): QueryVotesByVoterRequest {
  return {
    voter: '',
    pagination: undefined,
  };
}
export const QueryVotesByVoterRequest = {
  typeUrl: '/cosmos.group.v1.QueryVotesByVoterRequest',
  encode(
    message: QueryVotesByVoterRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.voter !== '') {
      writer.uint32(10).string(message.voter);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryVotesByVoterRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryVotesByVoterRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.voter = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryVotesByVoterRequest {
    return {
      voter: isSet(object.voter) ? String(object.voter) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryVotesByVoterRequest,
  ): JsonSafe<QueryVotesByVoterRequest> {
    const obj: any = {};
    message.voter !== undefined && (obj.voter = message.voter);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryVotesByVoterRequest>,
  ): QueryVotesByVoterRequest {
    const message = createBaseQueryVotesByVoterRequest();
    message.voter = object.voter ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryVotesByVoterRequestProtoMsg,
  ): QueryVotesByVoterRequest {
    return QueryVotesByVoterRequest.decode(message.value);
  },
  toProto(message: QueryVotesByVoterRequest): Uint8Array {
    return QueryVotesByVoterRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryVotesByVoterRequest,
  ): QueryVotesByVoterRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryVotesByVoterRequest',
      value: QueryVotesByVoterRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryVotesByVoterResponse(): QueryVotesByVoterResponse {
  return {
    votes: [],
    pagination: undefined,
  };
}
export const QueryVotesByVoterResponse = {
  typeUrl: '/cosmos.group.v1.QueryVotesByVoterResponse',
  encode(
    message: QueryVotesByVoterResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.votes) {
      Vote.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryVotesByVoterResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryVotesByVoterResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.votes.push(Vote.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryVotesByVoterResponse {
    return {
      votes: Array.isArray(object?.votes)
        ? object.votes.map((e: any) => Vote.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryVotesByVoterResponse,
  ): JsonSafe<QueryVotesByVoterResponse> {
    const obj: any = {};
    if (message.votes) {
      obj.votes = message.votes.map(e => (e ? Vote.toJSON(e) : undefined));
    } else {
      obj.votes = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryVotesByVoterResponse>,
  ): QueryVotesByVoterResponse {
    const message = createBaseQueryVotesByVoterResponse();
    message.votes = object.votes?.map(e => Vote.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryVotesByVoterResponseProtoMsg,
  ): QueryVotesByVoterResponse {
    return QueryVotesByVoterResponse.decode(message.value);
  },
  toProto(message: QueryVotesByVoterResponse): Uint8Array {
    return QueryVotesByVoterResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryVotesByVoterResponse,
  ): QueryVotesByVoterResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryVotesByVoterResponse',
      value: QueryVotesByVoterResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupsByMemberRequest(): QueryGroupsByMemberRequest {
  return {
    address: '',
    pagination: undefined,
  };
}
export const QueryGroupsByMemberRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupsByMemberRequest',
  encode(
    message: QueryGroupsByMemberRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupsByMemberRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupsByMemberRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupsByMemberRequest {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupsByMemberRequest,
  ): JsonSafe<QueryGroupsByMemberRequest> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupsByMemberRequest>,
  ): QueryGroupsByMemberRequest {
    const message = createBaseQueryGroupsByMemberRequest();
    message.address = object.address ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupsByMemberRequestProtoMsg,
  ): QueryGroupsByMemberRequest {
    return QueryGroupsByMemberRequest.decode(message.value);
  },
  toProto(message: QueryGroupsByMemberRequest): Uint8Array {
    return QueryGroupsByMemberRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupsByMemberRequest,
  ): QueryGroupsByMemberRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupsByMemberRequest',
      value: QueryGroupsByMemberRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupsByMemberResponse(): QueryGroupsByMemberResponse {
  return {
    groups: [],
    pagination: undefined,
  };
}
export const QueryGroupsByMemberResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupsByMemberResponse',
  encode(
    message: QueryGroupsByMemberResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.groups) {
      GroupInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupsByMemberResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupsByMemberResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groups.push(GroupInfo.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupsByMemberResponse {
    return {
      groups: Array.isArray(object?.groups)
        ? object.groups.map((e: any) => GroupInfo.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGroupsByMemberResponse,
  ): JsonSafe<QueryGroupsByMemberResponse> {
    const obj: any = {};
    if (message.groups) {
      obj.groups = message.groups.map(e =>
        e ? GroupInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groups = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGroupsByMemberResponse>,
  ): QueryGroupsByMemberResponse {
    const message = createBaseQueryGroupsByMemberResponse();
    message.groups = object.groups?.map(e => GroupInfo.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGroupsByMemberResponseProtoMsg,
  ): QueryGroupsByMemberResponse {
    return QueryGroupsByMemberResponse.decode(message.value);
  },
  toProto(message: QueryGroupsByMemberResponse): Uint8Array {
    return QueryGroupsByMemberResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGroupsByMemberResponse,
  ): QueryGroupsByMemberResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupsByMemberResponse',
      value: QueryGroupsByMemberResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryTallyResultRequest(): QueryTallyResultRequest {
  return {
    proposalId: BigInt(0),
  };
}
export const QueryTallyResultRequest = {
  typeUrl: '/cosmos.group.v1.QueryTallyResultRequest',
  encode(
    message: QueryTallyResultRequest,
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
  ): QueryTallyResultRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTallyResultRequest();
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
  fromJSON(object: any): QueryTallyResultRequest {
    return {
      proposalId: isSet(object.proposalId)
        ? BigInt(object.proposalId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: QueryTallyResultRequest): JsonSafe<QueryTallyResultRequest> {
    const obj: any = {};
    message.proposalId !== undefined &&
      (obj.proposalId = (message.proposalId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryTallyResultRequest>,
  ): QueryTallyResultRequest {
    const message = createBaseQueryTallyResultRequest();
    message.proposalId =
      object.proposalId !== undefined && object.proposalId !== null
        ? BigInt(object.proposalId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryTallyResultRequestProtoMsg,
  ): QueryTallyResultRequest {
    return QueryTallyResultRequest.decode(message.value);
  },
  toProto(message: QueryTallyResultRequest): Uint8Array {
    return QueryTallyResultRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryTallyResultRequest,
  ): QueryTallyResultRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryTallyResultRequest',
      value: QueryTallyResultRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryTallyResultResponse(): QueryTallyResultResponse {
  return {
    tally: TallyResult.fromPartial({}),
  };
}
export const QueryTallyResultResponse = {
  typeUrl: '/cosmos.group.v1.QueryTallyResultResponse',
  encode(
    message: QueryTallyResultResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tally !== undefined) {
      TallyResult.encode(message.tally, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTallyResultResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTallyResultResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tally = TallyResult.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTallyResultResponse {
    return {
      tally: isSet(object.tally)
        ? TallyResult.fromJSON(object.tally)
        : undefined,
    };
  },
  toJSON(
    message: QueryTallyResultResponse,
  ): JsonSafe<QueryTallyResultResponse> {
    const obj: any = {};
    message.tally !== undefined &&
      (obj.tally = message.tally
        ? TallyResult.toJSON(message.tally)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryTallyResultResponse>,
  ): QueryTallyResultResponse {
    const message = createBaseQueryTallyResultResponse();
    message.tally =
      object.tally !== undefined && object.tally !== null
        ? TallyResult.fromPartial(object.tally)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryTallyResultResponseProtoMsg,
  ): QueryTallyResultResponse {
    return QueryTallyResultResponse.decode(message.value);
  },
  toProto(message: QueryTallyResultResponse): Uint8Array {
    return QueryTallyResultResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryTallyResultResponse,
  ): QueryTallyResultResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryTallyResultResponse',
      value: QueryTallyResultResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupsRequest(): QueryGroupsRequest {
  return {
    pagination: undefined,
  };
}
export const QueryGroupsRequest = {
  typeUrl: '/cosmos.group.v1.QueryGroupsRequest',
  encode(
    message: QueryGroupsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupsRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryGroupsRequest): JsonSafe<QueryGroupsRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryGroupsRequest>): QueryGroupsRequest {
    const message = createBaseQueryGroupsRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryGroupsRequestProtoMsg): QueryGroupsRequest {
    return QueryGroupsRequest.decode(message.value);
  },
  toProto(message: QueryGroupsRequest): Uint8Array {
    return QueryGroupsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGroupsRequest): QueryGroupsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupsRequest',
      value: QueryGroupsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGroupsResponse(): QueryGroupsResponse {
  return {
    groups: [],
    pagination: undefined,
  };
}
export const QueryGroupsResponse = {
  typeUrl: '/cosmos.group.v1.QueryGroupsResponse',
  encode(
    message: QueryGroupsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.groups) {
      GroupInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGroupsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGroupsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.groups.push(GroupInfo.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGroupsResponse {
    return {
      groups: Array.isArray(object?.groups)
        ? object.groups.map((e: any) => GroupInfo.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryGroupsResponse): JsonSafe<QueryGroupsResponse> {
    const obj: any = {};
    if (message.groups) {
      obj.groups = message.groups.map(e =>
        e ? GroupInfo.toJSON(e) : undefined,
      );
    } else {
      obj.groups = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryGroupsResponse>): QueryGroupsResponse {
    const message = createBaseQueryGroupsResponse();
    message.groups = object.groups?.map(e => GroupInfo.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryGroupsResponseProtoMsg): QueryGroupsResponse {
    return QueryGroupsResponse.decode(message.value);
  },
  toProto(message: QueryGroupsResponse): Uint8Array {
    return QueryGroupsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGroupsResponse): QueryGroupsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.group.v1.QueryGroupsResponse',
      value: QueryGroupsResponse.encode(message).finish(),
    };
  },
};
