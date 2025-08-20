/**
 * @import {Proposal} from '@agoric/zoe';
 * @import {Passable} from '@endo/pass-style';
 */

/**
 * @typedef {number | string} OfferId
 */

/**
 * @typedef {object} ResultPlan
 * @property {string} name by which to save the item
 * @property {boolean} [overwrite=false] whether to overwrite an existing item.
 *   If false and there is a conflict, the contract will autogen a similar
 *   name.
 */

/**
 * @typedef {{
 *   targetName: string;
 *   method: string;
 *   args: Passable[];
 *   saveResult?: ResultPlan;
 *   id?: number | string;
 * }} InvokeEntryMessage
 */

/**
 * @typedef {{
 *   id: OfferId;
 *   invitationSpec: import('./invitations.js').InvitationSpec;
 *   proposal: Proposal;
 *   offerArgs?: any;
 *   saveResult?: ResultPlan;
 * }} OfferSpec
 *   If `saveResult` is provided, the result of the invocation will be saved to
 *   the specified location. Otherwise it will be published directly to vstorage
 *   (or 'UNPUBLISHED' if it cannot be).
 */

/** Value for "result" field when the result can't be published */
export const UNPUBLISHED_RESULT = 'UNPUBLISHED';

/**
 * @typedef {OfferSpec & {
 *   error?: string;
 *   numWantsSatisfied?: number;
 *   result?:
 *     | unknown
 *     | typeof UNPUBLISHED_RESULT
 *     | { name: string; passStyle: string };
 *   payouts?: AmountKeywordRecord;
 * }} OfferStatus
 */
