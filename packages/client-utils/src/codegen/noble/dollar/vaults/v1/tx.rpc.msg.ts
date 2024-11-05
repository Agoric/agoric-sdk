//@ts-nocheck
import { type Rpc } from '../../../../helpers.js';
import { BinaryReader } from '../../../../binary.js';
import {
  MsgLock,
  MsgLockResponse,
  MsgUnlock,
  MsgUnlockResponse,
  MsgSetPausedState,
  MsgSetPausedStateResponse,
} from './tx.js';
export interface Msg {
  lock(request: MsgLock): Promise<MsgLockResponse>;
  unlock(request: MsgUnlock): Promise<MsgUnlockResponse>;
  setPausedState(
    request: MsgSetPausedState,
  ): Promise<MsgSetPausedStateResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.lock = this.lock.bind(this);
    this.unlock = this.unlock.bind(this);
    this.setPausedState = this.setPausedState.bind(this);
  }
  lock(request: MsgLock): Promise<MsgLockResponse> {
    const data = MsgLock.encode(request).finish();
    const promise = this.rpc.request(
      'noble.dollar.vaults.v1.Msg',
      'Lock',
      data,
    );
    return promise.then(data => MsgLockResponse.decode(new BinaryReader(data)));
  }
  unlock(request: MsgUnlock): Promise<MsgUnlockResponse> {
    const data = MsgUnlock.encode(request).finish();
    const promise = this.rpc.request(
      'noble.dollar.vaults.v1.Msg',
      'Unlock',
      data,
    );
    return promise.then(data =>
      MsgUnlockResponse.decode(new BinaryReader(data)),
    );
  }
  setPausedState(
    request: MsgSetPausedState,
  ): Promise<MsgSetPausedStateResponse> {
    const data = MsgSetPausedState.encode(request).finish();
    const promise = this.rpc.request(
      'noble.dollar.vaults.v1.Msg',
      'SetPausedState',
      data,
    );
    return promise.then(data =>
      MsgSetPausedStateResponse.decode(new BinaryReader(data)),
    );
  }
}
