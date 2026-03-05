//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgUpdateParams,
  MsgUpdateParamsResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/auth/v1beta1/tx.js';
/** Msg defines the x/auth Msg service. */
export interface Msg {
  /**
   * UpdateParams defines a (governance) operation for updating the x/auth module
   * parameters. The authority defaults to the x/gov module account.
   *
   * Since: cosmos-sdk 0.47
   */
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.updateParams = this.updateParams.bind(this);
  }
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.auth.v1beta1.Msg',
      'UpdateParams',
      data,
    );
    return promise.then(data =>
      MsgUpdateParamsResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
