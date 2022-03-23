// @ts-check

import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';

import { KW } from './runStakeKit.js';

export { KW };

const PKey = /** @type { const } */ ({
  MintingRatio: 'MintingRatio',
  InterestRate: 'InterestRate',
  LoanFee: 'LoanFee',
});

/**
 * @param {ERef<ZoeService>} zoe
 * @param {{
 *   mintingRatio: Ratio,
 *   interestRate: Ratio,
 *   loanFee: Ratio,
 * }} rates
 * @param { Invitation} electorateInvitation
 */
export const makeRunStakeParamManager = async (
  zoe,
  { mintingRatio, interestRate, loanFee },
  electorateInvitation,
) => {
  return makeParamManager(
    {
      [PKey.MintingRatio]: [ParamTypes.RATIO, mintingRatio],
      [PKey.InterestRate]: [ParamTypes.RATIO, interestRate],
      [PKey.LoanFee]: [ParamTypes.RATIO, loanFee],
      [CONTRACT_ELECTORATE]: [ParamTypes.INVITATION, electorateInvitation],
    },
    zoe,
  );
};
harden(makeRunStakeParamManager);

export const makeRunStakeParams = ({
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
  main: makeRunStakeParams({
    electorateInvitationAmount,
    mintingRatio,
    interestRate,
    loanFee,
  }),
});
harden(makeRunStakeTerms);
