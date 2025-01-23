import { QueuedActionType } from '@agoric/internal/src/action-types.js';
import type {
  CoreEval,
  CoreEvalSDKType,
} from '@agoric/cosmic-proto/agoric/swingset/swingset.js';

// TODO move `walletFlags.js` from @agoric/vats to @agoric/cosmic-proto
type PowerFlag = 'SMART_WALLET' | 'REMOTE_WALLET';

// NB: keep these manually synced until we build these types out of the Golang
// structs or use some other shared type truth
// https://github.com/Agoric/agoric-sdk/issues/8545

interface ActionContext<T extends Uppercase<string>> {
  type: T;
  blockHeight: string;
  blockTime: string;
}

/**
 * @see coreEvalAction in proposal.go
 */
export type CoreEvalAction = ActionContext<'CORE_EVAL'> & {
  evals: CoreEvalSDKType[];
};

/**
 * @see provisionAction in msg_server.go
 */
export type PleaseProvisionAction = ActionContext<'PLEASE_PROVISION'> & {
  address: string;
  nickname: string;
  powerFlags: PowerFlag[];
  submitter: string;
  autoProvision: boolean;
};

/**
 * @see VbankBalanceUpdate in vbank.go
 */
export type VbankBalanceUpdateAction = ActionContext<'VBANK_BALANCE_UPDATE'> & {
  nonce: string;
  updated: Array<{ address: string; denom: string; amount: string }>;
};

export type BridgeMessage =
  | CoreEvalAction
  | PleaseProvisionAction
  | VbankBalanceUpdateAction;
