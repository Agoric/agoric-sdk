import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgDepositForBurn, MsgDepositForBurnResponse, MsgDepositForBurnWithCaller, MsgDepositForBurnWithCallerResponse, } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.depositForBurn = this.depositForBurn.bind(this);
        this.depositForBurnWithCaller = this.depositForBurnWithCaller.bind(this);
    }
    depositForBurn(request) {
        const data = MsgDepositForBurn.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Msg', 'DepositForBurn', data);
        return promise.then(data => MsgDepositForBurnResponse.decode(new BinaryReader(data)));
    }
    depositForBurnWithCaller(request) {
        const data = MsgDepositForBurnWithCaller.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Msg', 'DepositForBurnWithCaller', data);
        return promise.then(data => MsgDepositForBurnWithCallerResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map