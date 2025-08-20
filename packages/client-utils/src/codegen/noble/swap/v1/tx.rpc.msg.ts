//@ts-nocheck
import { type Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import {
  MsgSwap,
  MsgSwapResponse,
  MsgWithdrawProtocolFees,
  MsgWithdrawProtocolFeesResponse,
  MsgWithdrawRewards,
  MsgWithdrawRewardsResponse,
  MsgPauseByAlgorithm,
  MsgPauseByAlgorithmResponse,
  MsgPauseByPoolIds,
  MsgPauseByPoolIdsResponse,
  MsgUnpauseByAlgorithm,
  MsgUnpauseByAlgorithmResponse,
  MsgUnpauseByPoolIds,
  MsgUnpauseByPoolIdsResponse,
} from './tx.js';
export interface Msg {
  /** Swap allows a user to swap one type of token for another, using multiple routes. */
  swap(request: MsgSwap): Promise<MsgSwapResponse>;
  /** WithdrawProtocolFees allows the protocol to withdraw accumulated fees and move them to another account. */
  withdrawProtocolFees(
    request: MsgWithdrawProtocolFees,
  ): Promise<MsgWithdrawProtocolFeesResponse>;
  /** WithdrawRewards allows a user to claim their accumulated rewards. */
  withdrawRewards(
    request: MsgWithdrawRewards,
  ): Promise<MsgWithdrawRewardsResponse>;
  /** PauseByAlgorithm pauses all pools using a specific algorithm. */
  pauseByAlgorithm(
    request: MsgPauseByAlgorithm,
  ): Promise<MsgPauseByAlgorithmResponse>;
  /** PauseByPoolIds pauses specific pools identified by their pool IDs. */
  pauseByPoolIds(
    request: MsgPauseByPoolIds,
  ): Promise<MsgPauseByPoolIdsResponse>;
  /** UnpauseByAlgorithm unpauses all pools using a specific algorithm. */
  unpauseByAlgorithm(
    request: MsgUnpauseByAlgorithm,
  ): Promise<MsgUnpauseByAlgorithmResponse>;
  /** UnpauseByPoolIds unpauses specific pools identified by their pool IDs. */
  unpauseByPoolIds(
    request: MsgUnpauseByPoolIds,
  ): Promise<MsgUnpauseByPoolIdsResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.swap = this.swap.bind(this);
    this.withdrawProtocolFees = this.withdrawProtocolFees.bind(this);
    this.withdrawRewards = this.withdrawRewards.bind(this);
    this.pauseByAlgorithm = this.pauseByAlgorithm.bind(this);
    this.pauseByPoolIds = this.pauseByPoolIds.bind(this);
    this.unpauseByAlgorithm = this.unpauseByAlgorithm.bind(this);
    this.unpauseByPoolIds = this.unpauseByPoolIds.bind(this);
  }
  swap(request: MsgSwap): Promise<MsgSwapResponse> {
    const data = MsgSwap.encode(request).finish();
    const promise = this.rpc.request('noble.swap.v1.Msg', 'Swap', data);
    return promise.then(data => MsgSwapResponse.decode(new BinaryReader(data)));
  }
  withdrawProtocolFees(
    request: MsgWithdrawProtocolFees,
  ): Promise<MsgWithdrawProtocolFeesResponse> {
    const data = MsgWithdrawProtocolFees.encode(request).finish();
    const promise = this.rpc.request(
      'noble.swap.v1.Msg',
      'WithdrawProtocolFees',
      data,
    );
    return promise.then(data =>
      MsgWithdrawProtocolFeesResponse.decode(new BinaryReader(data)),
    );
  }
  withdrawRewards(
    request: MsgWithdrawRewards,
  ): Promise<MsgWithdrawRewardsResponse> {
    const data = MsgWithdrawRewards.encode(request).finish();
    const promise = this.rpc.request(
      'noble.swap.v1.Msg',
      'WithdrawRewards',
      data,
    );
    return promise.then(data =>
      MsgWithdrawRewardsResponse.decode(new BinaryReader(data)),
    );
  }
  pauseByAlgorithm(
    request: MsgPauseByAlgorithm,
  ): Promise<MsgPauseByAlgorithmResponse> {
    const data = MsgPauseByAlgorithm.encode(request).finish();
    const promise = this.rpc.request(
      'noble.swap.v1.Msg',
      'PauseByAlgorithm',
      data,
    );
    return promise.then(data =>
      MsgPauseByAlgorithmResponse.decode(new BinaryReader(data)),
    );
  }
  pauseByPoolIds(
    request: MsgPauseByPoolIds,
  ): Promise<MsgPauseByPoolIdsResponse> {
    const data = MsgPauseByPoolIds.encode(request).finish();
    const promise = this.rpc.request(
      'noble.swap.v1.Msg',
      'PauseByPoolIds',
      data,
    );
    return promise.then(data =>
      MsgPauseByPoolIdsResponse.decode(new BinaryReader(data)),
    );
  }
  unpauseByAlgorithm(
    request: MsgUnpauseByAlgorithm,
  ): Promise<MsgUnpauseByAlgorithmResponse> {
    const data = MsgUnpauseByAlgorithm.encode(request).finish();
    const promise = this.rpc.request(
      'noble.swap.v1.Msg',
      'UnpauseByAlgorithm',
      data,
    );
    return promise.then(data =>
      MsgUnpauseByAlgorithmResponse.decode(new BinaryReader(data)),
    );
  }
  unpauseByPoolIds(
    request: MsgUnpauseByPoolIds,
  ): Promise<MsgUnpauseByPoolIdsResponse> {
    const data = MsgUnpauseByPoolIds.encode(request).finish();
    const promise = this.rpc.request(
      'noble.swap.v1.Msg',
      'UnpauseByPoolIds',
      data,
    );
    return promise.then(data =>
      MsgUnpauseByPoolIdsResponse.decode(new BinaryReader(data)),
    );
  }
}
