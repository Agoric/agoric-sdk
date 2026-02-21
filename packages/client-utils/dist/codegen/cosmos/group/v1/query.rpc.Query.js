import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryGroupInfoRequest, QueryGroupInfoResponse, QueryGroupPolicyInfoRequest, QueryGroupPolicyInfoResponse, QueryGroupMembersRequest, QueryGroupMembersResponse, QueryGroupsByAdminRequest, QueryGroupsByAdminResponse, QueryGroupPoliciesByGroupRequest, QueryGroupPoliciesByGroupResponse, QueryGroupPoliciesByAdminRequest, QueryGroupPoliciesByAdminResponse, QueryProposalRequest, QueryProposalResponse, QueryProposalsByGroupPolicyRequest, QueryProposalsByGroupPolicyResponse, QueryVoteByProposalVoterRequest, QueryVoteByProposalVoterResponse, QueryVotesByProposalRequest, QueryVotesByProposalResponse, QueryVotesByVoterRequest, QueryVotesByVoterResponse, QueryGroupsByMemberRequest, QueryGroupsByMemberResponse, QueryTallyResultRequest, QueryTallyResultResponse, QueryGroupsRequest, QueryGroupsResponse, } from '@agoric/cosmic-proto/codegen/cosmos/group/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
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
    groupInfo(request) {
        const data = QueryGroupInfoRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupInfo', data);
        return promise.then(data => QueryGroupInfoResponse.decode(new BinaryReader(data)));
    }
    groupPolicyInfo(request) {
        const data = QueryGroupPolicyInfoRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupPolicyInfo', data);
        return promise.then(data => QueryGroupPolicyInfoResponse.decode(new BinaryReader(data)));
    }
    groupMembers(request) {
        const data = QueryGroupMembersRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupMembers', data);
        return promise.then(data => QueryGroupMembersResponse.decode(new BinaryReader(data)));
    }
    groupsByAdmin(request) {
        const data = QueryGroupsByAdminRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupsByAdmin', data);
        return promise.then(data => QueryGroupsByAdminResponse.decode(new BinaryReader(data)));
    }
    groupPoliciesByGroup(request) {
        const data = QueryGroupPoliciesByGroupRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupPoliciesByGroup', data);
        return promise.then(data => QueryGroupPoliciesByGroupResponse.decode(new BinaryReader(data)));
    }
    groupPoliciesByAdmin(request) {
        const data = QueryGroupPoliciesByAdminRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupPoliciesByAdmin', data);
        return promise.then(data => QueryGroupPoliciesByAdminResponse.decode(new BinaryReader(data)));
    }
    proposal(request) {
        const data = QueryProposalRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'Proposal', data);
        return promise.then(data => QueryProposalResponse.decode(new BinaryReader(data)));
    }
    proposalsByGroupPolicy(request) {
        const data = QueryProposalsByGroupPolicyRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'ProposalsByGroupPolicy', data);
        return promise.then(data => QueryProposalsByGroupPolicyResponse.decode(new BinaryReader(data)));
    }
    voteByProposalVoter(request) {
        const data = QueryVoteByProposalVoterRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'VoteByProposalVoter', data);
        return promise.then(data => QueryVoteByProposalVoterResponse.decode(new BinaryReader(data)));
    }
    votesByProposal(request) {
        const data = QueryVotesByProposalRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'VotesByProposal', data);
        return promise.then(data => QueryVotesByProposalResponse.decode(new BinaryReader(data)));
    }
    votesByVoter(request) {
        const data = QueryVotesByVoterRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'VotesByVoter', data);
        return promise.then(data => QueryVotesByVoterResponse.decode(new BinaryReader(data)));
    }
    groupsByMember(request) {
        const data = QueryGroupsByMemberRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'GroupsByMember', data);
        return promise.then(data => QueryGroupsByMemberResponse.decode(new BinaryReader(data)));
    }
    tallyResult(request) {
        const data = QueryTallyResultRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'TallyResult', data);
        return promise.then(data => QueryTallyResultResponse.decode(new BinaryReader(data)));
    }
    groups(request = {
        pagination: undefined,
    }) {
        const data = QueryGroupsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Query', 'Groups', data);
        return promise.then(data => QueryGroupsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        groupInfo(request) {
            return queryService.groupInfo(request);
        },
        groupPolicyInfo(request) {
            return queryService.groupPolicyInfo(request);
        },
        groupMembers(request) {
            return queryService.groupMembers(request);
        },
        groupsByAdmin(request) {
            return queryService.groupsByAdmin(request);
        },
        groupPoliciesByGroup(request) {
            return queryService.groupPoliciesByGroup(request);
        },
        groupPoliciesByAdmin(request) {
            return queryService.groupPoliciesByAdmin(request);
        },
        proposal(request) {
            return queryService.proposal(request);
        },
        proposalsByGroupPolicy(request) {
            return queryService.proposalsByGroupPolicy(request);
        },
        voteByProposalVoter(request) {
            return queryService.voteByProposalVoter(request);
        },
        votesByProposal(request) {
            return queryService.votesByProposal(request);
        },
        votesByVoter(request) {
            return queryService.votesByVoter(request);
        },
        groupsByMember(request) {
            return queryService.groupsByMember(request);
        },
        tallyResult(request) {
            return queryService.tallyResult(request);
        },
        groups(request) {
            return queryService.groups(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map