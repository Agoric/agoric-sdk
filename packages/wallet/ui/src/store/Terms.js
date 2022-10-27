import { TERMS_KEY, maybeSave, maybeLoad } from '../util/storage.js';

// The index of the current revision of the terms agreement. This should
// increment every time the terms change.
export const LATEST_TERMS_INDEX = 0;

export const agreeToTerms = (/** @type {number} */ index) =>
  maybeSave(TERMS_KEY, index);

export const getTermsIndexAccepted = () => maybeLoad(TERMS_KEY) ?? -1;
