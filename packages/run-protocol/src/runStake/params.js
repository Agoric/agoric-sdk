// @ts-check

import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';

/** RUNstakeParams are the parameters subject to governance. */
export const RUNstakeParams = /** @type { const } */ ({
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
      [RUNstakeParams.MintingRatio]: [ParamTypes.RATIO, mintingRatio],
      [RUNstakeParams.InterestRate]: [ParamTypes.RATIO, interestRate],
      [RUNstakeParams.LoanFee]: [ParamTypes.RATIO, loanFee],
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
    [RUNstakeParams.MintingRatio]: {
      type: ParamTypes.RATIO,
      value: mintingRatio,
    },
    [RUNstakeParams.InterestRate]: {
      type: ParamTypes.RATIO,
      value: interestRate,
    },
    [RUNstakeParams.LoanFee]: {
      type: ParamTypes.RATIO,
      value: loanFee,
    },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  });
};
harden(makeRunStakeParams);

export const makeRunStakeTerms = (
  {
    timerService,
    chargingPeriod,
    recordingPeriod,
    lienAttestationName = 'BldLienAtt',
  },
  { electorateInvitationAmount, mintingRatio, interestRate, loanFee },
) => ({
  timerService,
  chargingPeriod,
  recordingPeriod,
  lienAttestationName,
  main: makeRunStakeParams({
    electorateInvitationAmount,
    mintingRatio,
    interestRate,
    loanFee,
  }),
});
harden(makeRunStakeTerms);
