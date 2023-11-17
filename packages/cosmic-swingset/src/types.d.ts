import type {
  CoreEval,
  CoreEvalSDKType,
} from '@agoric/cosmic-proto/agoric/swingset/swingset.js';

interface BlockInfo {
  blockHeight: number;
  blockTime: number;
}

/**
 * @see coreEvalAction in proposal.go
 */
export type CoreEvalAction = BlockInfo & {
  type: ActionTypes.CORE_EVAL;
  evals: CoreEvalSDKType[];
};

export type BridgeMessage = CoreEvalAction;
