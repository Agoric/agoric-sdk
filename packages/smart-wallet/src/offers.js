/**
 * @import {InvitationDetails, Proposal} from '@agoric/zoe';
 */

/**
 * @typedef {number | string} OfferId
 */

// TODO: change saveAs to be direct part of step / offerSpec
// TODO: accept missing/undefined method name for function invocation
// TODO: change from multi step to a single InvokeSpec

/**
 * @typedef {{ method: string; args: unknown[] } | { saveAs: string }} OfferResultStep
 */

/**
 * @typedef {{
 *   id: OfferId;
 *   invitationSpec: import('./invitations.js').InvitationSpec;
 *   proposal: Proposal;
 *   offerArgs?: any;
 *   after?: {
 *     saveAs?: string;
 *   };
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
