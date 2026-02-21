import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgCreateGroup, MsgCreateGroupResponse, MsgUpdateGroupMembers, MsgUpdateGroupMembersResponse, MsgUpdateGroupAdmin, MsgUpdateGroupAdminResponse, MsgUpdateGroupMetadata, MsgUpdateGroupMetadataResponse, MsgCreateGroupPolicy, MsgCreateGroupPolicyResponse, MsgCreateGroupWithPolicy, MsgCreateGroupWithPolicyResponse, MsgUpdateGroupPolicyAdmin, MsgUpdateGroupPolicyAdminResponse, MsgUpdateGroupPolicyDecisionPolicy, MsgUpdateGroupPolicyDecisionPolicyResponse, MsgUpdateGroupPolicyMetadata, MsgUpdateGroupPolicyMetadataResponse, MsgSubmitProposal, MsgSubmitProposalResponse, MsgWithdrawProposal, MsgWithdrawProposalResponse, MsgVote, MsgVoteResponse, MsgExec, MsgExecResponse, MsgLeaveGroup, MsgLeaveGroupResponse, } from '@agoric/cosmic-proto/codegen/cosmos/group/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.createGroup = this.createGroup.bind(this);
        this.updateGroupMembers = this.updateGroupMembers.bind(this);
        this.updateGroupAdmin = this.updateGroupAdmin.bind(this);
        this.updateGroupMetadata = this.updateGroupMetadata.bind(this);
        this.createGroupPolicy = this.createGroupPolicy.bind(this);
        this.createGroupWithPolicy = this.createGroupWithPolicy.bind(this);
        this.updateGroupPolicyAdmin = this.updateGroupPolicyAdmin.bind(this);
        this.updateGroupPolicyDecisionPolicy =
            this.updateGroupPolicyDecisionPolicy.bind(this);
        this.updateGroupPolicyMetadata = this.updateGroupPolicyMetadata.bind(this);
        this.submitProposal = this.submitProposal.bind(this);
        this.withdrawProposal = this.withdrawProposal.bind(this);
        this.vote = this.vote.bind(this);
        this.exec = this.exec.bind(this);
        this.leaveGroup = this.leaveGroup.bind(this);
    }
    createGroup(request) {
        const data = MsgCreateGroup.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'CreateGroup', data);
        return promise.then(data => MsgCreateGroupResponse.decode(new BinaryReader(data)));
    }
    updateGroupMembers(request) {
        const data = MsgUpdateGroupMembers.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'UpdateGroupMembers', data);
        return promise.then(data => MsgUpdateGroupMembersResponse.decode(new BinaryReader(data)));
    }
    updateGroupAdmin(request) {
        const data = MsgUpdateGroupAdmin.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'UpdateGroupAdmin', data);
        return promise.then(data => MsgUpdateGroupAdminResponse.decode(new BinaryReader(data)));
    }
    updateGroupMetadata(request) {
        const data = MsgUpdateGroupMetadata.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'UpdateGroupMetadata', data);
        return promise.then(data => MsgUpdateGroupMetadataResponse.decode(new BinaryReader(data)));
    }
    createGroupPolicy(request) {
        const data = MsgCreateGroupPolicy.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'CreateGroupPolicy', data);
        return promise.then(data => MsgCreateGroupPolicyResponse.decode(new BinaryReader(data)));
    }
    createGroupWithPolicy(request) {
        const data = MsgCreateGroupWithPolicy.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'CreateGroupWithPolicy', data);
        return promise.then(data => MsgCreateGroupWithPolicyResponse.decode(new BinaryReader(data)));
    }
    updateGroupPolicyAdmin(request) {
        const data = MsgUpdateGroupPolicyAdmin.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'UpdateGroupPolicyAdmin', data);
        return promise.then(data => MsgUpdateGroupPolicyAdminResponse.decode(new BinaryReader(data)));
    }
    updateGroupPolicyDecisionPolicy(request) {
        const data = MsgUpdateGroupPolicyDecisionPolicy.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'UpdateGroupPolicyDecisionPolicy', data);
        return promise.then(data => MsgUpdateGroupPolicyDecisionPolicyResponse.decode(new BinaryReader(data)));
    }
    updateGroupPolicyMetadata(request) {
        const data = MsgUpdateGroupPolicyMetadata.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'UpdateGroupPolicyMetadata', data);
        return promise.then(data => MsgUpdateGroupPolicyMetadataResponse.decode(new BinaryReader(data)));
    }
    submitProposal(request) {
        const data = MsgSubmitProposal.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'SubmitProposal', data);
        return promise.then(data => MsgSubmitProposalResponse.decode(new BinaryReader(data)));
    }
    withdrawProposal(request) {
        const data = MsgWithdrawProposal.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'WithdrawProposal', data);
        return promise.then(data => MsgWithdrawProposalResponse.decode(new BinaryReader(data)));
    }
    vote(request) {
        const data = MsgVote.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'Vote', data);
        return promise.then(data => MsgVoteResponse.decode(new BinaryReader(data)));
    }
    exec(request) {
        const data = MsgExec.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'Exec', data);
        return promise.then(data => MsgExecResponse.decode(new BinaryReader(data)));
    }
    leaveGroup(request) {
        const data = MsgLeaveGroup.encode(request).finish();
        const promise = this.rpc.request('cosmos.group.v1.Msg', 'LeaveGroup', data);
        return promise.then(data => MsgLeaveGroupResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map