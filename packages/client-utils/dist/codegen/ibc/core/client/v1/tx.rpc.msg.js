import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgCreateClient, MsgCreateClientResponse, MsgUpdateClient, MsgUpdateClientResponse, MsgUpgradeClient, MsgUpgradeClientResponse, MsgSubmitMisbehaviour, MsgSubmitMisbehaviourResponse, MsgRecoverClient, MsgRecoverClientResponse, MsgIBCSoftwareUpgrade, MsgIBCSoftwareUpgradeResponse, MsgUpdateParams, MsgUpdateParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/client/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.createClient = this.createClient.bind(this);
        this.updateClient = this.updateClient.bind(this);
        this.upgradeClient = this.upgradeClient.bind(this);
        this.submitMisbehaviour = this.submitMisbehaviour.bind(this);
        this.recoverClient = this.recoverClient.bind(this);
        this.iBCSoftwareUpgrade = this.iBCSoftwareUpgrade.bind(this);
        this.updateClientParams = this.updateClientParams.bind(this);
    }
    createClient(request) {
        const data = MsgCreateClient.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'CreateClient', data);
        return promise.then(data => MsgCreateClientResponse.decode(new BinaryReader(data)));
    }
    updateClient(request) {
        const data = MsgUpdateClient.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'UpdateClient', data);
        return promise.then(data => MsgUpdateClientResponse.decode(new BinaryReader(data)));
    }
    upgradeClient(request) {
        const data = MsgUpgradeClient.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'UpgradeClient', data);
        return promise.then(data => MsgUpgradeClientResponse.decode(new BinaryReader(data)));
    }
    submitMisbehaviour(request) {
        const data = MsgSubmitMisbehaviour.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'SubmitMisbehaviour', data);
        return promise.then(data => MsgSubmitMisbehaviourResponse.decode(new BinaryReader(data)));
    }
    recoverClient(request) {
        const data = MsgRecoverClient.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'RecoverClient', data);
        return promise.then(data => MsgRecoverClientResponse.decode(new BinaryReader(data)));
    }
    iBCSoftwareUpgrade(request) {
        const data = MsgIBCSoftwareUpgrade.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'IBCSoftwareUpgrade', data);
        return promise.then(data => MsgIBCSoftwareUpgradeResponse.decode(new BinaryReader(data)));
    }
    updateClientParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('ibc.core.client.v1.Msg', 'UpdateClientParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map