import {
  agreeToTerms,
  getTermsAcceptance,
  LATEST_TERMS_INDEX,
} from '../store/Terms.js';

export const checkLatestAgreement = () =>
  getTermsAcceptance() === LATEST_TERMS_INDEX;

export const acceptTerms = () => agreeToTerms(LATEST_TERMS_INDEX);
