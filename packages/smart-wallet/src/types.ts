/**
 * @file Some types for smart-wallet contract
 *
 * Similar to types.js but in TypeScript syntax because some types here need it.
 * Downside is it can't reference any ambient types, which most of agoric-sdk type are presently.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- fails to notice the @see uses
import type { agoric } from '@agoric/cosmic-proto/agoric/bundle.js';
import type { Payment } from '@agoric/ertp';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { InvitationDetails } from '@agoric/zoe';
import type { PublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { OfferSpec } from './offers.js';

// Match the type in Zoe, which can't be imported because it's ambient.
// This omits the parameters that aren't used in this module.
type Invitation = Payment<'set', InvitationDetails>;

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

export type {
  WalletBridgeMsg,
  WalletActionMsg,
  WalletSpendActionMsg,
} from './schemas/codegen/type-guards.patterns.js';

/**
 * Used for clientSupport helpers
 */
export type OfferMaker = (
  agoricNames: AgoricNamesRemotes,
  ...rest: any[]
) => OfferSpec;
