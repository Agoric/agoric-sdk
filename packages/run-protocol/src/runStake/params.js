// @ts-check

import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';

import { KW } from './runStakeKit.js';

export { KW };

const PKey = /** @type { const } */ ({
  MintingRatio: 'MintingRatio',
  InterestRate: 'InterestRate',
  LoanFee: 'LoanFee',
});

const makeRunStakeParams = ({
  electorateInvitationAmount,
  mintingRatio,
  interestRate,
  loanFee,
}) => {
  return harden({
    [PKey.MintingRatio]: { type: ParamTypes.RATIO, value: mintingRatio },
    [PKey.InterestRate]: { type: ParamTypes.RATIO, value: interestRate },
    [PKey.LoanFee]: { type: ParamTypes.RATIO, value: loanFee },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  });
};
harden(makeRunStakeParams);

export const makeRunStakeTerms = (
  { timerService, chargingPeriod, recordingPeriod },
  { electorateInvitationAmount, mintingRatio, interestRate, loanFee },
) => ({
  timerService,
  chargingPeriod,
  recordingPeriod,
  governedParams: makeRunStakeParams({
    electorateInvitationAmount,
    mintingRatio,
    interestRate,
    loanFee,
  }),
});
harden(makeRunStakeTerms);
