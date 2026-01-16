//@ts-nocheck
import { type Rpc } from '../../helpers.js';
import { BinaryReader } from '../../binary.js';
import { MsgSetDenomMetadata, MsgSetDenomMetadataResponse } from './msgs.js';
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
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
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
