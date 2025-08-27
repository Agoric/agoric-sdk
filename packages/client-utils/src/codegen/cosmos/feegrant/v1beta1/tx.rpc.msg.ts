//@ts-nocheck
import { type Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import {
  MsgGrantAllowance,
  MsgGrantAllowanceResponse,
  MsgRevokeAllowance,
  MsgRevokeAllowanceResponse,
  MsgPruneAllowances,
  MsgPruneAllowancesResponse,
} from './tx.js';
/** Msg defines the feegrant msg service. */
export interface Msg {
  /**
   * GrantAllowance grants fee allowance to the grantee on the granter's
   * account with the provided expiration time.
   */
  grantAllowance(
    request: MsgGrantAllowance,
  ): Promise<MsgGrantAllowanceResponse>;
  /**
   * RevokeAllowance revokes any fee allowance of granter's account that
   * has been granted to the grantee.
   */
  revokeAllowance(
    request: MsgRevokeAllowance,
  ): Promise<MsgRevokeAllowanceResponse>;
  /**
   * PruneAllowances prunes expired fee allowances, currently up to 75 at a time.
   *
   * Since cosmos-sdk 0.50
   */
  pruneAllowances(
    request: MsgPruneAllowances,
  ): Promise<MsgPruneAllowancesResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.grantAllowance = this.grantAllowance.bind(this);
    this.revokeAllowance = this.revokeAllowance.bind(this);
    this.pruneAllowances = this.pruneAllowances.bind(this);
  }
  grantAllowance(
    request: MsgGrantAllowance,
  ): Promise<MsgGrantAllowanceResponse> {
    const data = MsgGrantAllowance.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.feegrant.v1beta1.Msg',
      'GrantAllowance',
      data,
    );
    return promise.then(data =>
      MsgGrantAllowanceResponse.decode(new BinaryReader(data)),
    );
  }
  revokeAllowance(
    request: MsgRevokeAllowance,
  ): Promise<MsgRevokeAllowanceResponse> {
    const data = MsgRevokeAllowance.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.feegrant.v1beta1.Msg',
      'RevokeAllowance',
      data,
    );
    return promise.then(data =>
      MsgRevokeAllowanceResponse.decode(new BinaryReader(data)),
    );
  }
  pruneAllowances(
    request: MsgPruneAllowances,
  ): Promise<MsgPruneAllowancesResponse> {
    const data = MsgPruneAllowances.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.feegrant.v1beta1.Msg',
      'PruneAllowances',
      data,
    );
    return promise.then(data =>
      MsgPruneAllowancesResponse.decode(new BinaryReader(data)),
    );
  }
}
