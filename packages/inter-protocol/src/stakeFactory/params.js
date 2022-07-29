// @ts-check
// @jessie-check

import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { ParamKW as PKey } from './constants.js';

export const makeStakeFactoryTerms = (
  { timerService, chargingPeriod, recordingPeriod },
  {
    electorateInvitationAmount,
    debtLimit,
    mintingRatio,
    interestRate,
    loanFee,
  },
) => ({
  timerService,
  chargingPeriod,
  recordingPeriod,
  governedParams: harden({
    [PKey.DebtLimit]: { type: ParamTypes.AMOUNT, value: debtLimit },
    [PKey.MintingRatio]: { type: ParamTypes.RATIO, value: mintingRatio },
    [PKey.InterestRate]: { type: ParamTypes.RATIO, value: interestRate },
    [PKey.LoanFee]: { type: ParamTypes.RATIO, value: loanFee },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  }),
});
harden(makeStakeFactoryTerms);
