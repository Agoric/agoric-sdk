/**
 * @file Some types for smart-wallet contract
 *
 * Similar to types.js but in TypeScript syntax because some types here need it.
 * Downside is it can't reference any ambient types, which most of agoric-sdk type are presently.
 */

import type { agoric } from '@agoric/cosmic-proto/agoric/bundle.js';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { PublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { OfferSpec } from './offers.js';

declare const CapDataShape: unique symbol;

/**
 * A petname can either be a plain string or a path for which the first element
 * is a petname for the origin, and the rest of the elements are a snapshot of
 * the names that were first given by that origin.  We are migrating away from
 * using plain strings, for consistency.
 */
export type Petname = string | string[];

export type InvitationMakers = Record<
  string,
  (...args: any[]) => Promise<Invitation>
>;

export type PublicSubscribers = Record<string, PublicTopic<unknown>>;

export interface ContinuingOfferResult {
  invitationMakers: InvitationMakers;
  publicSubscribers: PublicSubscribers;
}

export type Cell<T> = {
  get: () => T;
  set(val: T): void;
};

/**
 * Defined by walletAction struct in msg_server.go
 *
 * @see {agoric.swingset.MsgWalletAction} and walletSpendAction in msg_server.go
 */
export type WalletActionMsg = {
  type: 'WALLET_ACTION';
  /** base64 of Uint8Array of bech32 data  */
  owner: string;
  /** JSON of marshalled BridgeAction */
  action: string;
  blockHeight: unknown; // int64
  blockTime: unknown; // int64
};

/**
 * Defined by walletSpendAction struct in msg_server.go
 *
 * @see {agoric.swingset.MsgWalletSpendAction} and walletSpendAction in msg_server.go
 */
export type WalletSpendActionMsg = {
  type: 'WALLET_SPEND_ACTION';
  /** base64 of Uint8Array of bech32 data  */
  owner: string;
  /** JSON of BridgeActionCapData */
  spendAction: string;
  blockHeight: unknown; // int64
  blockTime: unknown; // int64
};

/**
 * Messages transmitted over Cosmos chain, cryptographically verifying that the
 * message came from the 'owner'.
 *
 * The two wallet actions are distinguished by whether the user had to confirm
 * the sending of the message (as is the case for WALLET_SPEND_ACTION).
 */
export type WalletBridgeMsg = WalletActionMsg | WalletSpendActionMsg;

/**
 * Used for clientSupport helpers
 */
export type OfferMaker = (
  agoricNames: AgoricNamesRemotes,
  ...rest: any[]
) => OfferSpec;
