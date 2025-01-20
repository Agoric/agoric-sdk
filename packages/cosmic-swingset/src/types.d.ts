import { QueuedActionType } from '@agoric/internal/src/action-types.js';
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
  type: 'CORE_EVAL';
  evals: CoreEvalSDKType[];
};

/**
 * @see provisionAction in msg_server.go
 */
export type PleaseProvisionAction = {
  type: 'PLEASE_PROVISION';
  address: string;
  nickname: string;
  powerFlags: PowerFlags.SMART_WALLET;
  submitter: string;
};

/**
 * @see VbankBalanceUpdate in vbank.go
 */
export type VbankBalanceUpdateAction = {
  type: 'VBANK_BALANCE_UPDATE';
  nonce: string;
  updated: Array<{ address: string; denom: string; amount: string }>;
};

export type BridgeMessage =
  | CoreEvalAction
  | PleaseProvisionAction
  | VbankBalanceUpdateAction;
