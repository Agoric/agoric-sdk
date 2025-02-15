import type { CoreEvalSDKType } from '@agoric/cosmic-proto/agoric/swingset/swingset.js';
import type { BridgeBigInt } from '@agoric/internal';

// TODO move `walletFlags.js` from @agoric/vats to @agoric/cosmic-proto
type PowerFlag = 'SMART_WALLET' | 'REMOTE_WALLET';

// NB: keep these manually synced until we build these types out of the Golang
// structs or use some other shared type truth
// https://github.com/Agoric/agoric-sdk/issues/8545

export type { BridgeBigInt };

interface ActionContext<T extends Uppercase<string>> {
  type: T;
  blockHeight: BridgeBigInt;
  blockTime: BridgeBigInt;
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
  nonce: BridgeBigInt;
  updated: Array<{ address: string; denom: string; amount: string }>;
};

export type BridgeMessage =
  | CoreEvalAction
  | PleaseProvisionAction
  | VbankBalanceUpdateAction;
