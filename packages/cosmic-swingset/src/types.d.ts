import type { CoreEval } from '@agoric/cosmic-proto/dist/agoric/swingset/swingset.js';

interface BlockInfo {
  blockHeight: number;
  blockTime: number;
}

/**
 * @see coreEvalAction in proposal.go
 */
export type CoreEvalAction = BlockInfo & {
  type: ActionTypes.CORE_EVAL;
  evals: CoreEval[];
};

export type BridgeMessage = CoreEvalAction;
