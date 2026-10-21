//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgLoadTest,
  MsgLoadTestResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/benchmark/v1/tx.js';
/** Msg defines the benchmark Msg service. */
export interface Msg {
  /** LoadTest defines a method for executing a sequence of load test operations. */
  loadTest(request: MsgLoadTest): Promise<MsgLoadTestResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.loadTest = this.loadTest.bind(this);
  }
  loadTest(request: MsgLoadTest): Promise<MsgLoadTestResponse> {
    const data = MsgLoadTest.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.benchmark.v1.Msg',
      'LoadTest',
      data,
    );
    return promise.then(data =>
      MsgLoadTestResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
