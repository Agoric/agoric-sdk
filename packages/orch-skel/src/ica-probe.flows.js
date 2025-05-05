// @ts-check
import { makeTracer, mustMatch } from '@agoric/internal';

const trace = makeTracer('flows');

/**
 * @import {Orchestrator, OrchestrationFlow } from '@agoric/orchestration';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {Passable, CopyRecord} from '@endo/pass-style';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{ }} _ctx
 * @param {ZCFSeat & Passable} seat
 * @param {{ chainName: string } & CopyRecord } offerArgs
 */
export const makeICA = async (orch, _ctx, seat, { chainName }) => {
  trace('TODO: charge fee', seat.getProposal());
  const chain = await orch.getChain(chainName);
  trace('making ICA on', chainName);
  const ica = await chain.makeAccount();
  const addr = await ica.getAddress();
  trace('make ICA with addr', addr);
  trace('TODO: dispose of ICA? retain it?');
  return addr;
};
