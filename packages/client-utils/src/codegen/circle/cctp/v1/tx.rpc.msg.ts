//@ts-nocheck
import { type Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import {
  MsgDepositForBurn,
  MsgDepositForBurnResponse,
  MsgDepositForBurnWithCaller,
  MsgDepositForBurnWithCallerResponse,
} from './tx.js';
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
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
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
