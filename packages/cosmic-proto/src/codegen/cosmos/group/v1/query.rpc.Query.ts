//@ts-nocheck
import { Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryGroupInfoRequest,
  QueryGroupInfoResponse,
  QueryGroupPolicyInfoRequest,
  QueryGroupPolicyInfoResponse,
  QueryGroupMembersRequest,
  QueryGroupMembersResponse,
  QueryGroupsByAdminRequest,
  QueryGroupsByAdminResponse,
  QueryGroupPoliciesByGroupRequest,
  QueryGroupPoliciesByGroupResponse,
  QueryGroupPoliciesByAdminRequest,
  QueryGroupPoliciesByAdminResponse,
  QueryProposalRequest,
  QueryProposalResponse,
  QueryProposalsByGroupPolicyRequest,
  QueryProposalsByGroupPolicyResponse,
  QueryVoteByProposalVoterRequest,
  QueryVoteByProposalVoterResponse,
  QueryVotesByProposalRequest,
  QueryVotesByProposalResponse,
  QueryVotesByVoterRequest,
  QueryVotesByVoterResponse,
  QueryGroupsByMemberRequest,
  QueryGroupsByMemberResponse,
  QueryTallyResultRequest,
  QueryTallyResultResponse,
  QueryGroupsRequest,
  QueryGroupsResponse,
} from './query.js';
/** Query is the cosmos.group.v1 Query service. */
export interface Query {
  /** GroupInfo queries group info based on group id. */
  groupInfo(request: QueryGroupInfoRequest): Promise<QueryGroupInfoResponse>;
  /** GroupPolicyInfo queries group policy info based on account address of group policy. */
  groupPolicyInfo(
    request: QueryGroupPolicyInfoRequest,
  ): Promise<QueryGroupPolicyInfoResponse>;
  /** GroupMembers queries members of a group */
  groupMembers(
    request: QueryGroupMembersRequest,
  ): Promise<QueryGroupMembersResponse>;
  /** GroupsByAdmin queries groups by admin address. */
  groupsByAdmin(
    request: QueryGroupsByAdminRequest,
  ): Promise<QueryGroupsByAdminResponse>;
  /** GroupPoliciesByGroup queries group policies by group id. */
  groupPoliciesByGroup(
    request: QueryGroupPoliciesByGroupRequest,
  ): Promise<QueryGroupPoliciesByGroupResponse>;
  /** GroupsByAdmin queries group policies by admin address. */
  groupPoliciesByAdmin(
    request: QueryGroupPoliciesByAdminRequest,
  ): Promise<QueryGroupPoliciesByAdminResponse>;
  /** Proposal queries a proposal based on proposal id. */
  proposal(request: QueryProposalRequest): Promise<QueryProposalResponse>;
  /** ProposalsByGroupPolicy queries proposals based on account address of group policy. */
  proposalsByGroupPolicy(
    request: QueryProposalsByGroupPolicyRequest,
  ): Promise<QueryProposalsByGroupPolicyResponse>;
  /** VoteByProposalVoter queries a vote by proposal id and voter. */
  voteByProposalVoter(
    request: QueryVoteByProposalVoterRequest,
  ): Promise<QueryVoteByProposalVoterResponse>;
  /** VotesByProposal queries a vote by proposal. */
  votesByProposal(
    request: QueryVotesByProposalRequest,
  ): Promise<QueryVotesByProposalResponse>;
  /** VotesByVoter queries a vote by voter. */
  votesByVoter(
    request: QueryVotesByVoterRequest,
  ): Promise<QueryVotesByVoterResponse>;
  /** GroupsByMember queries groups by member address. */
  groupsByMember(
    request: QueryGroupsByMemberRequest,
  ): Promise<QueryGroupsByMemberResponse>;
  /**
   * TallyResult returns the tally result of a proposal. If the proposal is
   * still in voting period, then this query computes the current tally state,
   * which might not be final. On the other hand, if the proposal is final,
   * then it simply returns the `final_tally_result` state stored in the
   * proposal itself.
   */
  tallyResult(
    request: QueryTallyResultRequest,
  ): Promise<QueryTallyResultResponse>;
  /**
   * Groups queries all groups in state.
   *
   * Since: cosmos-sdk 0.47.1
   */
  groups(request?: QueryGroupsRequest): Promise<QueryGroupsResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.groupInfo = this.groupInfo.bind(this);
    this.groupPolicyInfo = this.groupPolicyInfo.bind(this);
    this.groupMembers = this.groupMembers.bind(this);
    this.groupsByAdmin = this.groupsByAdmin.bind(this);
    this.groupPoliciesByGroup = this.groupPoliciesByGroup.bind(this);
    this.groupPoliciesByAdmin = this.groupPoliciesByAdmin.bind(this);
    this.proposal = this.proposal.bind(this);
    this.proposalsByGroupPolicy = this.proposalsByGroupPolicy.bind(this);
    this.voteByProposalVoter = this.voteByProposalVoter.bind(this);
    this.votesByProposal = this.votesByProposal.bind(this);
    this.votesByVoter = this.votesByVoter.bind(this);
    this.groupsByMember = this.groupsByMember.bind(this);
    this.tallyResult = this.tallyResult.bind(this);
    this.groups = this.groups.bind(this);
  }
  groupInfo(request: QueryGroupInfoRequest): Promise<QueryGroupInfoResponse> {
    const data = QueryGroupInfoRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupInfo',
      data,
    );
    return promise.then(data =>
      QueryGroupInfoResponse.decode(new BinaryReader(data)),
    );
  }
  groupPolicyInfo(
    request: QueryGroupPolicyInfoRequest,
  ): Promise<QueryGroupPolicyInfoResponse> {
    const data = QueryGroupPolicyInfoRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupPolicyInfo',
      data,
    );
    return promise.then(data =>
      QueryGroupPolicyInfoResponse.decode(new BinaryReader(data)),
    );
  }
  groupMembers(
    request: QueryGroupMembersRequest,
  ): Promise<QueryGroupMembersResponse> {
    const data = QueryGroupMembersRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupMembers',
      data,
    );
    return promise.then(data =>
      QueryGroupMembersResponse.decode(new BinaryReader(data)),
    );
  }
  groupsByAdmin(
    request: QueryGroupsByAdminRequest,
  ): Promise<QueryGroupsByAdminResponse> {
    const data = QueryGroupsByAdminRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupsByAdmin',
      data,
    );
    return promise.then(data =>
      QueryGroupsByAdminResponse.decode(new BinaryReader(data)),
    );
  }
  groupPoliciesByGroup(
    request: QueryGroupPoliciesByGroupRequest,
  ): Promise<QueryGroupPoliciesByGroupResponse> {
    const data = QueryGroupPoliciesByGroupRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupPoliciesByGroup',
      data,
    );
    return promise.then(data =>
      QueryGroupPoliciesByGroupResponse.decode(new BinaryReader(data)),
    );
  }
  groupPoliciesByAdmin(
    request: QueryGroupPoliciesByAdminRequest,
  ): Promise<QueryGroupPoliciesByAdminResponse> {
    const data = QueryGroupPoliciesByAdminRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupPoliciesByAdmin',
      data,
    );
    return promise.then(data =>
      QueryGroupPoliciesByAdminResponse.decode(new BinaryReader(data)),
    );
  }
  proposal(request: QueryProposalRequest): Promise<QueryProposalResponse> {
    const data = QueryProposalRequest.encode(request).finish();
    const promise = this.rpc.request('cosmos.group.v1.Query', 'Proposal', data);
    return promise.then(data =>
      QueryProposalResponse.decode(new BinaryReader(data)),
    );
  }
  proposalsByGroupPolicy(
    request: QueryProposalsByGroupPolicyRequest,
  ): Promise<QueryProposalsByGroupPolicyResponse> {
    const data = QueryProposalsByGroupPolicyRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'ProposalsByGroupPolicy',
      data,
    );
    return promise.then(data =>
      QueryProposalsByGroupPolicyResponse.decode(new BinaryReader(data)),
    );
  }
  voteByProposalVoter(
    request: QueryVoteByProposalVoterRequest,
  ): Promise<QueryVoteByProposalVoterResponse> {
    const data = QueryVoteByProposalVoterRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'VoteByProposalVoter',
      data,
    );
    return promise.then(data =>
      QueryVoteByProposalVoterResponse.decode(new BinaryReader(data)),
    );
  }
  votesByProposal(
    request: QueryVotesByProposalRequest,
  ): Promise<QueryVotesByProposalResponse> {
    const data = QueryVotesByProposalRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'VotesByProposal',
      data,
    );
    return promise.then(data =>
      QueryVotesByProposalResponse.decode(new BinaryReader(data)),
    );
  }
  votesByVoter(
    request: QueryVotesByVoterRequest,
  ): Promise<QueryVotesByVoterResponse> {
    const data = QueryVotesByVoterRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'VotesByVoter',
      data,
    );
    return promise.then(data =>
      QueryVotesByVoterResponse.decode(new BinaryReader(data)),
    );
  }
  groupsByMember(
    request: QueryGroupsByMemberRequest,
  ): Promise<QueryGroupsByMemberResponse> {
    const data = QueryGroupsByMemberRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'GroupsByMember',
      data,
    );
    return promise.then(data =>
      QueryGroupsByMemberResponse.decode(new BinaryReader(data)),
    );
  }
  tallyResult(
    request: QueryTallyResultRequest,
  ): Promise<QueryTallyResultResponse> {
    const data = QueryTallyResultRequest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.group.v1.Query',
      'TallyResult',
      data,
    );
    return promise.then(data =>
      QueryTallyResultResponse.decode(new BinaryReader(data)),
    );
  }
  groups(
    request: QueryGroupsRequest = {
      pagination: undefined,
    },
  ): Promise<QueryGroupsResponse> {
    const data = QueryGroupsRequest.encode(request).finish();
    const promise = this.rpc.request('cosmos.group.v1.Query', 'Groups', data);
    return promise.then(data =>
      QueryGroupsResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    groupInfo(request: QueryGroupInfoRequest): Promise<QueryGroupInfoResponse> {
      return queryService.groupInfo(request);
    },
    groupPolicyInfo(
      request: QueryGroupPolicyInfoRequest,
    ): Promise<QueryGroupPolicyInfoResponse> {
      return queryService.groupPolicyInfo(request);
    },
    groupMembers(
      request: QueryGroupMembersRequest,
    ): Promise<QueryGroupMembersResponse> {
      return queryService.groupMembers(request);
    },
    groupsByAdmin(
      request: QueryGroupsByAdminRequest,
    ): Promise<QueryGroupsByAdminResponse> {
      return queryService.groupsByAdmin(request);
    },
    groupPoliciesByGroup(
      request: QueryGroupPoliciesByGroupRequest,
    ): Promise<QueryGroupPoliciesByGroupResponse> {
      return queryService.groupPoliciesByGroup(request);
    },
    groupPoliciesByAdmin(
      request: QueryGroupPoliciesByAdminRequest,
    ): Promise<QueryGroupPoliciesByAdminResponse> {
      return queryService.groupPoliciesByAdmin(request);
    },
    proposal(request: QueryProposalRequest): Promise<QueryProposalResponse> {
      return queryService.proposal(request);
    },
    proposalsByGroupPolicy(
      request: QueryProposalsByGroupPolicyRequest,
    ): Promise<QueryProposalsByGroupPolicyResponse> {
      return queryService.proposalsByGroupPolicy(request);
    },
    voteByProposalVoter(
      request: QueryVoteByProposalVoterRequest,
    ): Promise<QueryVoteByProposalVoterResponse> {
      return queryService.voteByProposalVoter(request);
    },
    votesByProposal(
      request: QueryVotesByProposalRequest,
    ): Promise<QueryVotesByProposalResponse> {
      return queryService.votesByProposal(request);
    },
    votesByVoter(
      request: QueryVotesByVoterRequest,
    ): Promise<QueryVotesByVoterResponse> {
      return queryService.votesByVoter(request);
    },
    groupsByMember(
      request: QueryGroupsByMemberRequest,
    ): Promise<QueryGroupsByMemberResponse> {
      return queryService.groupsByMember(request);
    },
    tallyResult(
      request: QueryTallyResultRequest,
    ): Promise<QueryTallyResultResponse> {
      return queryService.tallyResult(request);
    },
    groups(request?: QueryGroupsRequest): Promise<QueryGroupsResponse> {
      return queryService.groups(request);
    },
  };
};
