import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgSubmitProposal, MsgSubmitProposalResponse, MsgExecLegacyContent, MsgExecLegacyContentResponse, MsgVote, MsgVoteResponse, MsgVoteWeighted, MsgVoteWeightedResponse, MsgDeposit, MsgDepositResponse, MsgUpdateParams, MsgUpdateParamsResponse, MsgCancelProposal, MsgCancelProposalResponse, } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.submitProposal = this.submitProposal.bind(this);
        this.execLegacyContent = this.execLegacyContent.bind(this);
        this.vote = this.vote.bind(this);
        this.voteWeighted = this.voteWeighted.bind(this);
        this.deposit = this.deposit.bind(this);
        this.updateParams = this.updateParams.bind(this);
        this.cancelProposal = this.cancelProposal.bind(this);
    }
    submitProposal(request) {
        const data = MsgSubmitProposal.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'SubmitProposal', data);
        return promise.then(data => MsgSubmitProposalResponse.decode(new BinaryReader(data)));
    }
    execLegacyContent(request) {
        const data = MsgExecLegacyContent.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'ExecLegacyContent', data);
        return promise.then(data => MsgExecLegacyContentResponse.decode(new BinaryReader(data)));
    }
    vote(request) {
        const data = MsgVote.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'Vote', data);
        return promise.then(data => MsgVoteResponse.decode(new BinaryReader(data)));
    }
    voteWeighted(request) {
        const data = MsgVoteWeighted.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'VoteWeighted', data);
        return promise.then(data => MsgVoteWeightedResponse.decode(new BinaryReader(data)));
    }
    deposit(request) {
        const data = MsgDeposit.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'Deposit', data);
        return promise.then(data => MsgDepositResponse.decode(new BinaryReader(data)));
    }
    updateParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'UpdateParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
    cancelProposal(request) {
        const data = MsgCancelProposal.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1.Msg', 'CancelProposal', data);
        return promise.then(data => MsgCancelProposalResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map