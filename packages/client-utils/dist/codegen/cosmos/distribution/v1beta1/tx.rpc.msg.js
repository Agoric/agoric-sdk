import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgSetWithdrawAddress, MsgSetWithdrawAddressResponse, MsgWithdrawDelegatorReward, MsgWithdrawDelegatorRewardResponse, MsgWithdrawValidatorCommission, MsgWithdrawValidatorCommissionResponse, MsgFundCommunityPool, MsgFundCommunityPoolResponse, MsgUpdateParams, MsgUpdateParamsResponse, MsgCommunityPoolSpend, MsgCommunityPoolSpendResponse, MsgDepositValidatorRewardsPool, MsgDepositValidatorRewardsPoolResponse, } from '@agoric/cosmic-proto/codegen/cosmos/distribution/v1beta1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.setWithdrawAddress = this.setWithdrawAddress.bind(this);
        this.withdrawDelegatorReward = this.withdrawDelegatorReward.bind(this);
        this.withdrawValidatorCommission =
            this.withdrawValidatorCommission.bind(this);
        this.fundCommunityPool = this.fundCommunityPool.bind(this);
        this.updateParams = this.updateParams.bind(this);
        this.communityPoolSpend = this.communityPoolSpend.bind(this);
        this.depositValidatorRewardsPool =
            this.depositValidatorRewardsPool.bind(this);
    }
    setWithdrawAddress(request) {
        const data = MsgSetWithdrawAddress.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'SetWithdrawAddress', data);
        return promise.then(data => MsgSetWithdrawAddressResponse.decode(new BinaryReader(data)));
    }
    withdrawDelegatorReward(request) {
        const data = MsgWithdrawDelegatorReward.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'WithdrawDelegatorReward', data);
        return promise.then(data => MsgWithdrawDelegatorRewardResponse.decode(new BinaryReader(data)));
    }
    withdrawValidatorCommission(request) {
        const data = MsgWithdrawValidatorCommission.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'WithdrawValidatorCommission', data);
        return promise.then(data => MsgWithdrawValidatorCommissionResponse.decode(new BinaryReader(data)));
    }
    fundCommunityPool(request) {
        const data = MsgFundCommunityPool.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'FundCommunityPool', data);
        return promise.then(data => MsgFundCommunityPoolResponse.decode(new BinaryReader(data)));
    }
    updateParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'UpdateParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
    communityPoolSpend(request) {
        const data = MsgCommunityPoolSpend.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'CommunityPoolSpend', data);
        return promise.then(data => MsgCommunityPoolSpendResponse.decode(new BinaryReader(data)));
    }
    depositValidatorRewardsPool(request) {
        const data = MsgDepositValidatorRewardsPool.encode(request).finish();
        const promise = this.rpc.request('cosmos.distribution.v1beta1.Msg', 'DepositValidatorRewardsPool', data);
        return promise.then(data => MsgDepositValidatorRewardsPoolResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map