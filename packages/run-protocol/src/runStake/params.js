// @ts-check

import { makeGovernedRatio } from '@agoric/governance';
import { makeElectorateParams } from '../vaultFactory/params';

/** RUNstakeParams are the parameters subject to governance. */
export const RUNstakeParams = {
  MintingRatio: 'MintingRatio',
  InterestRate: 'InterestRate',
  LoanFee: 'LoanFee',
};

/**
 * @param {Object} terms
 * @param {Ratio} terms.mintingRatio
 * @param {Ratio} terms.interestRate
 * @param {Ratio} terms.loanFee
 * @param {Amount} terms.electorateInvitationAmount
 */
export const makeRunStakeTerms = ({
  mintingRatio,
  interestRate,
  loanFee,
  electorateInvitationAmount,
}) =>
  harden({
    [RUNstakeParams.MintingRatio]: makeGovernedRatio(mintingRatio),
    [RUNstakeParams.InterestRate]: makeGovernedRatio(interestRate),
    [RUNstakeParams.LoanFee]: makeGovernedRatio(loanFee),
    ...makeElectorateParams(electorateInvitationAmount),
  });
