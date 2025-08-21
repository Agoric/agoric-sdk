//@ts-nocheck
import { type Rpc } from '../../../../../helpers.js';
import { BinaryReader } from '../../../../../binary.js';
import {
  MsgUpdateParams,
  MsgUpdateParamsResponse,
  MsgModuleQuerySafe,
  MsgModuleQuerySafeResponse,
} from './tx.js';
/** Msg defines the 27-interchain-accounts/host Msg service. */
export interface Msg {
  /** UpdateParams defines a rpc handler for MsgUpdateParams. */
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
  /** ModuleQuerySafe defines a rpc handler for MsgModuleQuerySafe. */
  moduleQuerySafe(
    request: MsgModuleQuerySafe,
  ): Promise<MsgModuleQuerySafeResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.updateParams = this.updateParams.bind(this);
    this.moduleQuerySafe = this.moduleQuerySafe.bind(this);
  }
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.interchain_accounts.host.v1.Msg',
      'UpdateParams',
      data,
    );
    return promise.then(data =>
      MsgUpdateParamsResponse.decode(new BinaryReader(data)),
    );
  }
  moduleQuerySafe(
    request: MsgModuleQuerySafe,
  ): Promise<MsgModuleQuerySafeResponse> {
    const data = MsgModuleQuerySafe.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.applications.interchain_accounts.host.v1.Msg',
      'ModuleQuerySafe',
      data,
    );
    return promise.then(data =>
      MsgModuleQuerySafeResponse.decode(new BinaryReader(data)),
    );
  }
}
