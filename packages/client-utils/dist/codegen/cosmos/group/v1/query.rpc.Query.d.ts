import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryGroupInfoRequest, QueryGroupInfoResponse, QueryGroupPolicyInfoRequest, QueryGroupPolicyInfoResponse, QueryGroupMembersRequest, QueryGroupMembersResponse, QueryGroupsByAdminRequest, QueryGroupsByAdminResponse, QueryGroupPoliciesByGroupRequest, QueryGroupPoliciesByGroupResponse, QueryGroupPoliciesByAdminRequest, QueryGroupPoliciesByAdminResponse, QueryProposalRequest, QueryProposalResponse, QueryProposalsByGroupPolicyRequest, QueryProposalsByGroupPolicyResponse, QueryVoteByProposalVoterRequest, QueryVoteByProposalVoterResponse, QueryVotesByProposalRequest, QueryVotesByProposalResponse, QueryVotesByVoterRequest, QueryVotesByVoterResponse, QueryGroupsByMemberRequest, QueryGroupsByMemberResponse, QueryTallyResultRequest, QueryTallyResultResponse, QueryGroupsRequest, QueryGroupsResponse } from '@agoric/cosmic-proto/codegen/cosmos/group/v1/query.js';
/** Query is the cosmos.group.v1 Query service. */
export interface Query {
    /** GroupInfo queries group info based on group id. */
    groupInfo(request: QueryGroupInfoRequest): Promise<QueryGroupInfoResponse>;
    /** GroupPolicyInfo queries group policy info based on account address of group policy. */
    groupPolicyInfo(request: QueryGroupPolicyInfoRequest): Promise<QueryGroupPolicyInfoResponse>;
    /** GroupMembers queries members of a group by group id. */
    groupMembers(request: QueryGroupMembersRequest): Promise<QueryGroupMembersResponse>;
    /** GroupsByAdmin queries groups by admin address. */
    groupsByAdmin(request: QueryGroupsByAdminRequest): Promise<QueryGroupsByAdminResponse>;
    /** GroupPoliciesByGroup queries group policies by group id. */
    groupPoliciesByGroup(request: QueryGroupPoliciesByGroupRequest): Promise<QueryGroupPoliciesByGroupResponse>;
    /** GroupPoliciesByAdmin queries group policies by admin address. */
    groupPoliciesByAdmin(request: QueryGroupPoliciesByAdminRequest): Promise<QueryGroupPoliciesByAdminResponse>;
    /** Proposal queries a proposal based on proposal id. */
    proposal(request: QueryProposalRequest): Promise<QueryProposalResponse>;
    /** ProposalsByGroupPolicy queries proposals based on account address of group policy. */
    proposalsByGroupPolicy(request: QueryProposalsByGroupPolicyRequest): Promise<QueryProposalsByGroupPolicyResponse>;
    /** VoteByProposalVoter queries a vote by proposal id and voter. */
    voteByProposalVoter(request: QueryVoteByProposalVoterRequest): Promise<QueryVoteByProposalVoterResponse>;
    /** VotesByProposal queries a vote by proposal id. */
    votesByProposal(request: QueryVotesByProposalRequest): Promise<QueryVotesByProposalResponse>;
    /** VotesByVoter queries a vote by voter. */
    votesByVoter(request: QueryVotesByVoterRequest): Promise<QueryVotesByVoterResponse>;
    /** GroupsByMember queries groups by member address. */
    groupsByMember(request: QueryGroupsByMemberRequest): Promise<QueryGroupsByMemberResponse>;
    /**
     * TallyResult returns the tally result of a proposal. If the proposal is
     * still in voting period, then this query computes the current tally state,
     * which might not be final. On the other hand, if the proposal is final,
     * then it simply returns the `final_tally_result` state stored in the
     * proposal itself.
     */
    tallyResult(request: QueryTallyResultRequest): Promise<QueryTallyResultResponse>;
    /**
     * Groups queries all groups in state.
     *
     * Since: cosmos-sdk 0.47.1
     */
    groups(request?: QueryGroupsRequest): Promise<QueryGroupsResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    groupInfo(request: QueryGroupInfoRequest): Promise<QueryGroupInfoResponse>;
    groupPolicyInfo(request: QueryGroupPolicyInfoRequest): Promise<QueryGroupPolicyInfoResponse>;
    groupMembers(request: QueryGroupMembersRequest): Promise<QueryGroupMembersResponse>;
    groupsByAdmin(request: QueryGroupsByAdminRequest): Promise<QueryGroupsByAdminResponse>;
    groupPoliciesByGroup(request: QueryGroupPoliciesByGroupRequest): Promise<QueryGroupPoliciesByGroupResponse>;
    groupPoliciesByAdmin(request: QueryGroupPoliciesByAdminRequest): Promise<QueryGroupPoliciesByAdminResponse>;
    proposal(request: QueryProposalRequest): Promise<QueryProposalResponse>;
    proposalsByGroupPolicy(request: QueryProposalsByGroupPolicyRequest): Promise<QueryProposalsByGroupPolicyResponse>;
    voteByProposalVoter(request: QueryVoteByProposalVoterRequest): Promise<QueryVoteByProposalVoterResponse>;
    votesByProposal(request: QueryVotesByProposalRequest): Promise<QueryVotesByProposalResponse>;
    votesByVoter(request: QueryVotesByVoterRequest): Promise<QueryVotesByVoterResponse>;
    groupsByMember(request: QueryGroupsByMemberRequest): Promise<QueryGroupsByMemberResponse>;
    tallyResult(request: QueryTallyResultRequest): Promise<QueryTallyResultResponse>;
    groups(request?: QueryGroupsRequest): Promise<QueryGroupsResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    groupInfo(request: QueryGroupInfoRequest): Promise<QueryGroupInfoResponse>;
    groupPolicyInfo(request: QueryGroupPolicyInfoRequest): Promise<QueryGroupPolicyInfoResponse>;
    groupMembers(request: QueryGroupMembersRequest): Promise<QueryGroupMembersResponse>;
    groupsByAdmin(request: QueryGroupsByAdminRequest): Promise<QueryGroupsByAdminResponse>;
    groupPoliciesByGroup(request: QueryGroupPoliciesByGroupRequest): Promise<QueryGroupPoliciesByGroupResponse>;
    groupPoliciesByAdmin(request: QueryGroupPoliciesByAdminRequest): Promise<QueryGroupPoliciesByAdminResponse>;
    proposal(request: QueryProposalRequest): Promise<QueryProposalResponse>;
    proposalsByGroupPolicy(request: QueryProposalsByGroupPolicyRequest): Promise<QueryProposalsByGroupPolicyResponse>;
    voteByProposalVoter(request: QueryVoteByProposalVoterRequest): Promise<QueryVoteByProposalVoterResponse>;
    votesByProposal(request: QueryVotesByProposalRequest): Promise<QueryVotesByProposalResponse>;
    votesByVoter(request: QueryVotesByVoterRequest): Promise<QueryVotesByVoterResponse>;
    groupsByMember(request: QueryGroupsByMemberRequest): Promise<QueryGroupsByMemberResponse>;
    tallyResult(request: QueryTallyResultRequest): Promise<QueryTallyResultResponse>;
    groups(request?: QueryGroupsRequest): Promise<QueryGroupsResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map