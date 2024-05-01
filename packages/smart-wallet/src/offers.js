// XXX ambient types runtime imports until https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/zoe/src/zoeService/types-ambient.js';

/**
 * @typedef {number | string} OfferId
 */

/**
 * @typedef {{
 *   id: OfferId,
 *   invitationSpec: import('./invitations.js').InvitationSpec,
 *   proposal: Proposal,
 *   offerArgs?: unknown
 * }} OfferSpec
 */

/** Value for "result" field when the result can't be published */
export const UNPUBLISHED_RESULT = 'UNPUBLISHED';

/**
 * @typedef {OfferSpec & {
 * error?: string,
 * numWantsSatisfied?: number
 * result?: unknown | typeof UNPUBLISHED_RESULT,
 * payouts?: AmountKeywordRecord,
 * }} OfferStatus
 */
