// @ts-check

import { keyEQ } from '@agoric/store';

import { handleParamGovernance } from '../../../src/contractHelper.js';
import { makeParamManagerBuilder } from '../../../src/paramGovernance/paramManager.js';
import { CONTRACT_ELECTORATE } from '../../../src/paramGovernance/governParam.js';
import {
  makeGovernedNat,
  makeGovernedInvitation,
} from '../../../src/paramGovernance/paramMakers.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

const { details: X } = assert;

const makeParamTerms = (number, invitationAmount) => {
  return harden({
    [MALLEABLE_NUMBER]: makeGovernedNat(number),
    [CONTRACT_ELECTORATE]: makeGovernedInvitation(invitationAmount),
  });
};

const makeParamManager = async (zoe, number, invitation) => {
  const builder = makeParamManagerBuilder(zoe).addNat(MALLEABLE_NUMBER, number);
  await builder.addInvitation(CONTRACT_ELECTORATE, invitation);
  return builder.build();
};

/**
 * @param {ZoeCF<{
 *   main: {
 *     [MALLEABLE_NUMBER]: ParamDescription,
 *     [CONTRACT_ELECTORATE]: ParamDescription,
 *   }
 * }>} zcf
 * @param {{initialPoserInvitation: Invitation}} privateArgs
 */
const start = async (zcf, privateArgs) => {
  const {
    main: {
      [MALLEABLE_NUMBER]: numberParam,
      [CONTRACT_ELECTORATE]: electorateParam,
    },
  } = zcf.getTerms();
  const { initialPoserInvitation } = privateArgs;

  const paramManager = await makeParamManager(
    zcf.getZoeService(),
    numberParam.value,
    initialPoserInvitation,
  );

  const { wrapPublicFacet, wrapCreatorFacet, getInvitationAmount } =
    handleParamGovernance(zcf, paramManager);

  const invitationAmount = getInvitationAmount(CONTRACT_ELECTORATE);
  assert(
    keyEQ(invitationAmount, electorateParam.value),
    X`electorate amount ${electorateParam.value} didn't match ${invitationAmount}`,
  );

  return {
    publicFacet: wrapPublicFacet({}),
    creatorFacet: wrapCreatorFacet({}),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);
harden(makeParamTerms);

export { start, MALLEABLE_NUMBER, makeParamTerms };
