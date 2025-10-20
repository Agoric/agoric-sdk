import type { Proposal } from '@agoric/zoe';
import type { Passable } from '@endo/pass-style';
import type { AmountKeywordRecord } from '@agoric/zoe/src/zoeService/types.js';
import type { InvitationSpec } from './invitations.js';

/**
 * This is a string that uniquely identifies an offer within a smart wallet.
 *
 * This type used to be a union with number but that led to confusion. For
 * backwards compatibility with clients sending number the contract coerces them
 * to string at first opportunity..
 */
export type OfferId = string;

export interface ResultPlan {
  /** by which to save the item */
  name: string;
  /** whether to overwrite an existing item. If false and there is a conflict, the contract will autogen a similar name. */
  overwrite?: boolean;
  [key: string]: Passable; // XXX CopyRecord expects
}

export interface InvokeEntryMessage {
  targetName: string;
  method: string;
  args: Passable[];
  saveResult?: ResultPlan;
  id?: number | string;
  [key: string]: Passable; // XXX CopyRecord expects
}

/**
 * If `saveResult` is provided, the result of the invocation will be saved to
 * the specified location. Otherwise it will be published directly to vstorage
 * (or 'UNPUBLISHED' if it cannot be).
 */
export interface OfferSpec {
  id: OfferId;
  invitationSpec: InvitationSpec;
  proposal: Proposal;
  offerArgs?: any;
  saveResult?: ResultPlan;
}

/** Value for "result" field when the result can't be published */
export const UNPUBLISHED_RESULT = 'UNPUBLISHED';

export interface OfferStatus extends OfferSpec {
  error?: string;
  numWantsSatisfied?: number;
  result?:
    | unknown
    | typeof UNPUBLISHED_RESULT
    | { name: string; passStyle: string };
  payouts?: AmountKeywordRecord;
}
