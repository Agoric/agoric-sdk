import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgConnectionOpenInit, MsgConnectionOpenInitResponse, MsgConnectionOpenTry, MsgConnectionOpenTryResponse, MsgConnectionOpenAck, MsgConnectionOpenAckResponse, MsgConnectionOpenConfirm, MsgConnectionOpenConfirmResponse, MsgUpdateParams, MsgUpdateParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/connection/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.connectionOpenInit = this.connectionOpenInit.bind(this);
        this.connectionOpenTry = this.connectionOpenTry.bind(this);
        this.connectionOpenAck = this.connectionOpenAck.bind(this);
        this.connectionOpenConfirm = this.connectionOpenConfirm.bind(this);
        this.updateConnectionParams = this.updateConnectionParams.bind(this);
    }
    connectionOpenInit(request) {
        const data = MsgConnectionOpenInit.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Msg', 'ConnectionOpenInit', data);
        return promise.then(data => MsgConnectionOpenInitResponse.decode(new BinaryReader(data)));
    }
    connectionOpenTry(request) {
        const data = MsgConnectionOpenTry.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Msg', 'ConnectionOpenTry', data);
        return promise.then(data => MsgConnectionOpenTryResponse.decode(new BinaryReader(data)));
    }
    connectionOpenAck(request) {
        const data = MsgConnectionOpenAck.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Msg', 'ConnectionOpenAck', data);
        return promise.then(data => MsgConnectionOpenAckResponse.decode(new BinaryReader(data)));
    }
    connectionOpenConfirm(request) {
        const data = MsgConnectionOpenConfirm.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Msg', 'ConnectionOpenConfirm', data);
        return promise.then(data => MsgConnectionOpenConfirmResponse.decode(new BinaryReader(data)));
    }
    updateConnectionParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Msg', 'UpdateConnectionParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map