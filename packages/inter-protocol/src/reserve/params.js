// @jessie-check

import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';

const makeReserveTerms = (poserInvitationAmount, timer) => ({
  timer,
  governedParams: harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: poserInvitationAmount,
    },
  }),
});

harden(makeReserveTerms);

export { makeReserveTerms };
