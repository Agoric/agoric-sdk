//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgDepositForBurn,
  MsgDepositForBurnResponse,
  MsgDepositForBurnWithCaller,
  MsgDepositForBurnWithCallerResponse,
} from '@agoric/cosmic-proto/codegen/circle/cctp/v1/tx.js';
/** Msg defines the Msg service. */
export interface Msg {
  /**
   * rpc AcceptOwner(MsgAcceptOwner) returns (MsgAcceptOwnerResponse);
   * rpc AddRemoteTokenMessenger(MsgAddRemoteTokenMessenger) returns (MsgAddRemoteTokenMessengerResponse);
   */
  depositForBurn(
    request: MsgDepositForBurn,
  ): Promise<MsgDepositForBurnResponse>;
  depositForBurnWithCaller(
    request: MsgDepositForBurnWithCaller,
  ): Promise<MsgDepositForBurnWithCallerResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.depositForBurn = this.depositForBurn.bind(this);
    this.depositForBurnWithCaller = this.depositForBurnWithCaller.bind(this);
  }
  depositForBurn(
    request: MsgDepositForBurn,
  ): Promise<MsgDepositForBurnResponse> {
    const data = MsgDepositForBurn.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Msg',
      'DepositForBurn',
      data,
    );
    return promise.then(data =>
      MsgDepositForBurnResponse.decode(new BinaryReader(data)),
    );
  }
  depositForBurnWithCaller(
    request: MsgDepositForBurnWithCaller,
  ): Promise<MsgDepositForBurnWithCallerResponse> {
    const data = MsgDepositForBurnWithCaller.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Msg',
      'DepositForBurnWithCaller',
      data,
    );
    return promise.then(data =>
      MsgDepositForBurnWithCallerResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
