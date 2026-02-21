import { QueryGroupInfoRequest, QueryGroupInfoResponse, QueryGroupPolicyInfoRequest, QueryGroupPolicyInfoResponse, QueryGroupMembersRequest, QueryGroupMembersResponse, QueryGroupsByAdminRequest, QueryGroupsByAdminResponse, QueryGroupPoliciesByGroupRequest, QueryGroupPoliciesByGroupResponse, QueryGroupPoliciesByAdminRequest, QueryGroupPoliciesByAdminResponse, QueryProposalRequest, QueryProposalResponse, QueryProposalsByGroupPolicyRequest, QueryProposalsByGroupPolicyResponse, QueryVoteByProposalVoterRequest, QueryVoteByProposalVoterResponse, QueryVotesByProposalRequest, QueryVotesByProposalResponse, QueryVotesByVoterRequest, QueryVotesByVoterResponse, QueryGroupsByMemberRequest, QueryGroupsByMemberResponse, QueryTallyResultRequest, QueryTallyResultResponse, QueryGroupsRequest, QueryGroupsResponse } from './query.js';
/**
 * GroupInfo queries group info based on group id.
 * @name getGroupInfo
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupInfo
 */
export declare const getGroupInfo: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupInfoRequest) => Promise<QueryGroupInfoResponse>;
/**
 * GroupPolicyInfo queries group policy info based on account address of group policy.
 * @name getGroupPolicyInfo
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupPolicyInfo
 */
export declare const getGroupPolicyInfo: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupPolicyInfoRequest) => Promise<QueryGroupPolicyInfoResponse>;
/**
 * GroupMembers queries members of a group by group id.
 * @name getGroupMembers
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupMembers
 */
export declare const getGroupMembers: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupMembersRequest) => Promise<QueryGroupMembersResponse>;
/**
 * GroupsByAdmin queries groups by admin address.
 * @name getGroupsByAdmin
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupsByAdmin
 */
export declare const getGroupsByAdmin: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupsByAdminRequest) => Promise<QueryGroupsByAdminResponse>;
/**
 * GroupPoliciesByGroup queries group policies by group id.
 * @name getGroupPoliciesByGroup
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupPoliciesByGroup
 */
export declare const getGroupPoliciesByGroup: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupPoliciesByGroupRequest) => Promise<QueryGroupPoliciesByGroupResponse>;
/**
 * GroupPoliciesByAdmin queries group policies by admin address.
 * @name getGroupPoliciesByAdmin
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupPoliciesByAdmin
 */
export declare const getGroupPoliciesByAdmin: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupPoliciesByAdminRequest) => Promise<QueryGroupPoliciesByAdminResponse>;
/**
 * Proposal queries a proposal based on proposal id.
 * @name getProposal
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.Proposal
 */
export declare const getProposal: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryProposalRequest) => Promise<QueryProposalResponse>;
/**
 * ProposalsByGroupPolicy queries proposals based on account address of group policy.
 * @name getProposalsByGroupPolicy
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.ProposalsByGroupPolicy
 */
export declare const getProposalsByGroupPolicy: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryProposalsByGroupPolicyRequest) => Promise<QueryProposalsByGroupPolicyResponse>;
/**
 * VoteByProposalVoter queries a vote by proposal id and voter.
 * @name getVoteByProposalVoter
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.VoteByProposalVoter
 */
export declare const getVoteByProposalVoter: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryVoteByProposalVoterRequest) => Promise<QueryVoteByProposalVoterResponse>;
/**
 * VotesByProposal queries a vote by proposal id.
 * @name getVotesByProposal
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.VotesByProposal
 */
export declare const getVotesByProposal: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryVotesByProposalRequest) => Promise<QueryVotesByProposalResponse>;
/**
 * VotesByVoter queries a vote by voter.
 * @name getVotesByVoter
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.VotesByVoter
 */
export declare const getVotesByVoter: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryVotesByVoterRequest) => Promise<QueryVotesByVoterResponse>;
/**
 * GroupsByMember queries groups by member address.
 * @name getGroupsByMember
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.GroupsByMember
 */
export declare const getGroupsByMember: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupsByMemberRequest) => Promise<QueryGroupsByMemberResponse>;
/**
 * TallyResult returns the tally result of a proposal. If the proposal is
 * still in voting period, then this query computes the current tally state,
 * which might not be final. On the other hand, if the proposal is final,
 * then it simply returns the `final_tally_result` state stored in the
 * proposal itself.
 * @name getTallyResult
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.TallyResult
 */
export declare const getTallyResult: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryTallyResultRequest) => Promise<QueryTallyResultResponse>;
/**
 * Groups queries all groups in state.
 *
 * Since: cosmos-sdk 0.47.1
 * @name getGroups
 * @package cosmos.group.v1
 * @see proto service: cosmos.group.v1.Groups
 */
export declare const getGroups: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryGroupsRequest) => Promise<QueryGroupsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map