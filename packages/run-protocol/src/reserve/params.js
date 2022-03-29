// @ts-check

import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';

export const AMM_INSTANCE = 'AmmInstance';

const makeReserveTerms = (poserInvitationAmount, ammInstance, timer) => ({
  timer,
  governedParams: harden({
    [AMM_INSTANCE]: { type: ParamTypes.INSTANCE, value: ammInstance },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: poserInvitationAmount,
    },
  }),
});

harden(makeReserveTerms);

export { makeReserveTerms };
