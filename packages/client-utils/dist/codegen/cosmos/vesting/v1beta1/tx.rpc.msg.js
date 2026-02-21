import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgCreateVestingAccount, MsgCreateVestingAccountResponse, MsgCreatePermanentLockedAccount, MsgCreatePermanentLockedAccountResponse, MsgCreatePeriodicVestingAccount, MsgCreatePeriodicVestingAccountResponse, MsgCreateClawbackVestingAccount, MsgCreateClawbackVestingAccountResponse, MsgClawback, MsgClawbackResponse, MsgReturnGrants, MsgReturnGrantsResponse, } from '@agoric/cosmic-proto/codegen/cosmos/vesting/v1beta1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.createVestingAccount = this.createVestingAccount.bind(this);
        this.createPermanentLockedAccount =
            this.createPermanentLockedAccount.bind(this);
        this.createPeriodicVestingAccount =
            this.createPeriodicVestingAccount.bind(this);
        this.createClawbackVestingAccount =
            this.createClawbackVestingAccount.bind(this);
        this.clawback = this.clawback.bind(this);
        this.returnGrants = this.returnGrants.bind(this);
    }
    createVestingAccount(request) {
        const data = MsgCreateVestingAccount.encode(request).finish();
        const promise = this.rpc.request('cosmos.vesting.v1beta1.Msg', 'CreateVestingAccount', data);
        return promise.then(data => MsgCreateVestingAccountResponse.decode(new BinaryReader(data)));
    }
    createPermanentLockedAccount(request) {
        const data = MsgCreatePermanentLockedAccount.encode(request).finish();
        const promise = this.rpc.request('cosmos.vesting.v1beta1.Msg', 'CreatePermanentLockedAccount', data);
        return promise.then(data => MsgCreatePermanentLockedAccountResponse.decode(new BinaryReader(data)));
    }
    createPeriodicVestingAccount(request) {
        const data = MsgCreatePeriodicVestingAccount.encode(request).finish();
        const promise = this.rpc.request('cosmos.vesting.v1beta1.Msg', 'CreatePeriodicVestingAccount', data);
        return promise.then(data => MsgCreatePeriodicVestingAccountResponse.decode(new BinaryReader(data)));
    }
    createClawbackVestingAccount(request) {
        const data = MsgCreateClawbackVestingAccount.encode(request).finish();
        const promise = this.rpc.request('cosmos.vesting.v1beta1.Msg', 'CreateClawbackVestingAccount', data);
        return promise.then(data => MsgCreateClawbackVestingAccountResponse.decode(new BinaryReader(data)));
    }
    clawback(request) {
        const data = MsgClawback.encode(request).finish();
        const promise = this.rpc.request('cosmos.vesting.v1beta1.Msg', 'Clawback', data);
        return promise.then(data => MsgClawbackResponse.decode(new BinaryReader(data)));
    }
    returnGrants(request) {
        const data = MsgReturnGrants.encode(request).finish();
        const promise = this.rpc.request('cosmos.vesting.v1beta1.Msg', 'ReturnGrants', data);
        return promise.then(data => MsgReturnGrantsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map