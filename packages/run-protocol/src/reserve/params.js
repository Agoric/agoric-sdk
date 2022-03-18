// @ts-check

import {
  CONTRACT_ELECTORATE,
  makeParamManager as makeBaseParamManager,
  ParamTypes,
} from '@agoric/governance';

export const AMM_INSTANCE_KEY = 'AmmInstance';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} ammInstance
 * @param {Invitation} poserInvitation - invitation for the question poser
 */
const makeParamManager = async (zoe, ammInstance, poserInvitation) => {
  return makeBaseParamManager(
    {
      [AMM_INSTANCE_KEY]: ['instance', ammInstance],
      [CONTRACT_ELECTORATE]: ['invitation', poserInvitation],
    },
    zoe,
  );
};

const makeReserveTerms = (poserInvitationAmount, ammInstance, timer) => ({
  timer,
  main: harden({
    [AMM_INSTANCE_KEY]: { type: ParamTypes.INSTANCE, value: ammInstance },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: poserInvitationAmount,
    },
  }),
  governedApis: ['addLiquidityToAmmPool'],
});

harden(makeParamManager);
harden(makeReserveTerms);

export { makeParamManager, makeReserveTerms };
