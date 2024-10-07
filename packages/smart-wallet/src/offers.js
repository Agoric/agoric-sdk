/** @import {InvitationSpec} from './types-index.js'; */

/**
 * @typedef {number | string} OfferId
 */

/**
 * @typedef {{
 *   id: OfferId;
 *   invitationSpec: InvitationSpec;
 *   proposal: Proposal;
 *   offerArgs?: any;
 * }} OfferSpec
 */

/** Value for "result" field when the result can't be published */
export const UNPUBLISHED_RESULT = 'UNPUBLISHED';

/**
 * @typedef {OfferSpec & {
 *   error?: string;
 *   numWantsSatisfied?: number;
 *   result?: unknown | typeof UNPUBLISHED_RESULT;
 *   payouts?: AmountKeywordRecord;
 * }} OfferStatus
 */
