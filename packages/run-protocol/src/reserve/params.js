// @ts-check

import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';

export const AMM_INSTANCE = 'AmmInstance';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} ammInstance
 * @param {Invitation} poserInvitation - invitation for the question poser
 */
const makeReserveParamManager = async (zoe, ammInstance, poserInvitation) => {
  return makeParamManager(
    {
      [AMM_INSTANCE]: ['instance', ammInstance],
      [CONTRACT_ELECTORATE]: ['invitation', poserInvitation],
    },
    zoe,
  );
};

const makeReserveTerms = (poserInvitationAmount, ammInstance, timer) => ({
  timer,
  main: harden({
    [AMM_INSTANCE]: { type: ParamTypes.INSTANCE, value: ammInstance },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: poserInvitationAmount,
    },
  }),
});

harden(makeReserveParamManager);
harden(makeReserveTerms);

export { makeReserveParamManager, makeReserveTerms };
