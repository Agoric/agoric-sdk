import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgSubmitProposal, MsgSubmitProposalResponse, MsgVote, MsgVoteResponse, MsgVoteWeighted, MsgVoteWeightedResponse, MsgDeposit, MsgDepositResponse, } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1beta1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.submitProposal = this.submitProposal.bind(this);
        this.vote = this.vote.bind(this);
        this.voteWeighted = this.voteWeighted.bind(this);
        this.deposit = this.deposit.bind(this);
    }
    submitProposal(request) {
        const data = MsgSubmitProposal.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1beta1.Msg', 'SubmitProposal', data);
        return promise.then(data => MsgSubmitProposalResponse.decode(new BinaryReader(data)));
    }
    vote(request) {
        const data = MsgVote.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1beta1.Msg', 'Vote', data);
        return promise.then(data => MsgVoteResponse.decode(new BinaryReader(data)));
    }
    voteWeighted(request) {
        const data = MsgVoteWeighted.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1beta1.Msg', 'VoteWeighted', data);
        return promise.then(data => MsgVoteWeightedResponse.decode(new BinaryReader(data)));
    }
    deposit(request) {
        const data = MsgDeposit.encode(request).finish();
        const promise = this.rpc.request('cosmos.gov.v1beta1.Msg', 'Deposit', data);
        return promise.then(data => MsgDepositResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map