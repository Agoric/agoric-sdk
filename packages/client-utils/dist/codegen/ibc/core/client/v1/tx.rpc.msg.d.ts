import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgCreateClient, MsgCreateClientResponse, MsgUpdateClient, MsgUpdateClientResponse, MsgUpgradeClient, MsgUpgradeClientResponse, MsgSubmitMisbehaviour, MsgSubmitMisbehaviourResponse, MsgRecoverClient, MsgRecoverClientResponse, MsgIBCSoftwareUpgrade, MsgIBCSoftwareUpgradeResponse, MsgUpdateParams, MsgUpdateParamsResponse } from '@agoric/cosmic-proto/codegen/ibc/core/client/v1/tx.js';
/** Msg defines the ibc/client Msg service. */
export interface Msg {
    /** CreateClient defines a rpc handler method for MsgCreateClient. */
    createClient(request: MsgCreateClient): Promise<MsgCreateClientResponse>;
    /** UpdateClient defines a rpc handler method for MsgUpdateClient. */
    updateClient(request: MsgUpdateClient): Promise<MsgUpdateClientResponse>;
    /** UpgradeClient defines a rpc handler method for MsgUpgradeClient. */
    upgradeClient(request: MsgUpgradeClient): Promise<MsgUpgradeClientResponse>;
    /** SubmitMisbehaviour defines a rpc handler method for MsgSubmitMisbehaviour. */
    submitMisbehaviour(request: MsgSubmitMisbehaviour): Promise<MsgSubmitMisbehaviourResponse>;
    /** RecoverClient defines a rpc handler method for MsgRecoverClient. */
    recoverClient(request: MsgRecoverClient): Promise<MsgRecoverClientResponse>;
    /** IBCSoftwareUpgrade defines a rpc handler method for MsgIBCSoftwareUpgrade. */
    iBCSoftwareUpgrade(request: MsgIBCSoftwareUpgrade): Promise<MsgIBCSoftwareUpgradeResponse>;
    /** UpdateClientParams defines a rpc handler method for MsgUpdateParams. */
    updateClientParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    createClient(request: MsgCreateClient): Promise<MsgCreateClientResponse>;
    updateClient(request: MsgUpdateClient): Promise<MsgUpdateClientResponse>;
    upgradeClient(request: MsgUpgradeClient): Promise<MsgUpgradeClientResponse>;
    submitMisbehaviour(request: MsgSubmitMisbehaviour): Promise<MsgSubmitMisbehaviourResponse>;
    recoverClient(request: MsgRecoverClient): Promise<MsgRecoverClientResponse>;
    iBCSoftwareUpgrade(request: MsgIBCSoftwareUpgrade): Promise<MsgIBCSoftwareUpgradeResponse>;
    updateClientParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map