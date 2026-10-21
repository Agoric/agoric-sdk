//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgIncreaseCounter,
  MsgIncreaseCountResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/counter/v1/tx.js';
/** Msg defines the counter Msg service. */
export interface Msg {
  /** IncreaseCount increments the counter by the specified amount. */
  increaseCount(request: MsgIncreaseCounter): Promise<MsgIncreaseCountResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.increaseCount = this.increaseCount.bind(this);
  }
  increaseCount(
    request: MsgIncreaseCounter,
  ): Promise<MsgIncreaseCountResponse> {
    const data = MsgIncreaseCounter.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.counter.v1.Msg',
      'IncreaseCount',
      data,
    );
    return promise.then(data =>
      MsgIncreaseCountResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
