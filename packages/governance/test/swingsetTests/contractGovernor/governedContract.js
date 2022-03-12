// @ts-check

import { keyEQ } from '@agoric/store';

import { handleParamGovernance } from '../../../src/contractHelper.js';
import { CONTRACT_ELECTORATE } from '../../../src/paramGovernance/governParam.js';
import {
  makeGovernedNat,
  makeGovernedInvitation,
} from '../../../src/paramGovernance/paramMakers.js';
import { makeParamManager } from '../../../src/index.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

const { details: X } = assert;

const makeParamTerms = (number, invitationAmount) => {
  return harden({
    [MALLEABLE_NUMBER]: makeGovernedNat(number),
    [CONTRACT_ELECTORATE]: makeGovernedInvitation(invitationAmount),
  });
};

/**
 * @param {ContractFacet<{
 *   electionManager: VoteOnParamChange,
 *   main: {
 *     MalleableNumber: ParamRecord<'nat'>,
 *     Electorate: ParamRecord<'amount'>,
 *   },
 * }>} zcf
 * @param {{initialPoserInvitation: Payment}} privateArgs
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
    {
      [MALLEABLE_NUMBER]: { type: 'nat', value: numberParam.value },
      [CONTRACT_ELECTORATE]: {
        type: 'invitation',
        value: initialPoserInvitation,
      },
    },
    zcf.getZoeService(),
  );

  const { wrapPublicFacet, wrapCreatorFacet, getInvitationAmount } =
    handleParamGovernance(zcf, paramManager);

  const invitationAmount = getInvitationAmount(CONTRACT_ELECTORATE);
  assert(
    keyEQ(invitationAmount, electorateParam.value),
    // @ts-expect-error 'amount' prop?
    X`electorate amount ${electorateParam.amount} didn't match ${invitationAmount}`,
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
