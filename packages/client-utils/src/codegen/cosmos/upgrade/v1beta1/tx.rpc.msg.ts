//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgSoftwareUpgrade,
  MsgSoftwareUpgradeResponse,
  MsgCancelUpgrade,
  MsgCancelUpgradeResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/upgrade/v1beta1/tx.js';
/** Msg defines the upgrade Msg service. */
export interface Msg {
  /**
   * SoftwareUpgrade is a governance operation for initiating a software upgrade.
   *
   * Since: cosmos-sdk 0.46
   */
  softwareUpgrade(
    request: MsgSoftwareUpgrade,
  ): Promise<MsgSoftwareUpgradeResponse>;
  /**
   * CancelUpgrade is a governance operation for cancelling a previously
   * approved software upgrade.
   *
   * Since: cosmos-sdk 0.46
   */
  cancelUpgrade(request: MsgCancelUpgrade): Promise<MsgCancelUpgradeResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.softwareUpgrade = this.softwareUpgrade.bind(this);
    this.cancelUpgrade = this.cancelUpgrade.bind(this);
  }
  softwareUpgrade(
    request: MsgSoftwareUpgrade,
  ): Promise<MsgSoftwareUpgradeResponse> {
    const data = MsgSoftwareUpgrade.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.upgrade.v1beta1.Msg',
      'SoftwareUpgrade',
      data,
    );
    return promise.then(data =>
      MsgSoftwareUpgradeResponse.decode(new BinaryReader(data)),
    );
  }
  cancelUpgrade(request: MsgCancelUpgrade): Promise<MsgCancelUpgradeResponse> {
    const data = MsgCancelUpgrade.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.upgrade.v1beta1.Msg',
      'CancelUpgrade',
      data,
    );
    return promise.then(data =>
      MsgCancelUpgradeResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
