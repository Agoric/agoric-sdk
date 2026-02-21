import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgSwap, MsgSwapResponse, MsgWithdrawProtocolFees, MsgWithdrawProtocolFeesResponse, MsgWithdrawRewards, MsgWithdrawRewardsResponse, MsgPauseByAlgorithm, MsgPauseByAlgorithmResponse, MsgPauseByPoolIds, MsgPauseByPoolIdsResponse, MsgUnpauseByAlgorithm, MsgUnpauseByAlgorithmResponse, MsgUnpauseByPoolIds, MsgUnpauseByPoolIdsResponse, } from '@agoric/cosmic-proto/codegen/noble/swap/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.swap = this.swap.bind(this);
        this.withdrawProtocolFees = this.withdrawProtocolFees.bind(this);
        this.withdrawRewards = this.withdrawRewards.bind(this);
        this.pauseByAlgorithm = this.pauseByAlgorithm.bind(this);
        this.pauseByPoolIds = this.pauseByPoolIds.bind(this);
        this.unpauseByAlgorithm = this.unpauseByAlgorithm.bind(this);
        this.unpauseByPoolIds = this.unpauseByPoolIds.bind(this);
    }
    swap(request) {
        const data = MsgSwap.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'Swap', data);
        return promise.then(data => MsgSwapResponse.decode(new BinaryReader(data)));
    }
    withdrawProtocolFees(request) {
        const data = MsgWithdrawProtocolFees.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'WithdrawProtocolFees', data);
        return promise.then(data => MsgWithdrawProtocolFeesResponse.decode(new BinaryReader(data)));
    }
    withdrawRewards(request) {
        const data = MsgWithdrawRewards.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'WithdrawRewards', data);
        return promise.then(data => MsgWithdrawRewardsResponse.decode(new BinaryReader(data)));
    }
    pauseByAlgorithm(request) {
        const data = MsgPauseByAlgorithm.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'PauseByAlgorithm', data);
        return promise.then(data => MsgPauseByAlgorithmResponse.decode(new BinaryReader(data)));
    }
    pauseByPoolIds(request) {
        const data = MsgPauseByPoolIds.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'PauseByPoolIds', data);
        return promise.then(data => MsgPauseByPoolIdsResponse.decode(new BinaryReader(data)));
    }
    unpauseByAlgorithm(request) {
        const data = MsgUnpauseByAlgorithm.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'UnpauseByAlgorithm', data);
        return promise.then(data => MsgUnpauseByAlgorithmResponse.decode(new BinaryReader(data)));
    }
    unpauseByPoolIds(request) {
        const data = MsgUnpauseByPoolIds.encode(request).finish();
        const promise = this.rpc.request('noble.swap.v1.Msg', 'UnpauseByPoolIds', data);
        return promise.then(data => MsgUnpauseByPoolIdsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map