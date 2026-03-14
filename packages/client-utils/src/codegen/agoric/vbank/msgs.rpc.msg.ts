//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgSetDenomMetadata,
  MsgSetDenomMetadataResponse,
} from '@agoric/cosmic-proto/codegen/agoric/vbank/msgs.js';
/** Msg defines the vbank Msg service. */
export interface Msg {
  /**
   * SetDenomMetadata defines a governance operation for setting the metadata for a denom.
   * The authority is defined in the keeper.
   */
  setDenomMetadata(
    request: MsgSetDenomMetadata,
  ): Promise<MsgSetDenomMetadataResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.setDenomMetadata = this.setDenomMetadata.bind(this);
  }
  setDenomMetadata(
    request: MsgSetDenomMetadata,
  ): Promise<MsgSetDenomMetadataResponse> {
    const data = MsgSetDenomMetadata.encode(request).finish();
    const promise = this.rpc.request(
      'agoric.vbank.Msg',
      'SetDenomMetadata',
      data,
    );
    return promise.then(data =>
      MsgSetDenomMetadataResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
