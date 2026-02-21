import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgDepositForBurn, MsgDepositForBurnResponse, MsgDepositForBurnWithCaller, MsgDepositForBurnWithCallerResponse } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/tx.js';
/** Msg defines the Msg service. */
export interface Msg {
    /**
     * rpc AcceptOwner(MsgAcceptOwner) returns (MsgAcceptOwnerResponse);
     * rpc AddRemoteTokenMessenger(MsgAddRemoteTokenMessenger) returns (MsgAddRemoteTokenMessengerResponse);
     */
    depositForBurn(request: MsgDepositForBurn): Promise<MsgDepositForBurnResponse>;
    depositForBurnWithCaller(request: MsgDepositForBurnWithCaller): Promise<MsgDepositForBurnWithCallerResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    depositForBurn(request: MsgDepositForBurn): Promise<MsgDepositForBurnResponse>;
    depositForBurnWithCaller(request: MsgDepositForBurnWithCaller): Promise<MsgDepositForBurnWithCallerResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map