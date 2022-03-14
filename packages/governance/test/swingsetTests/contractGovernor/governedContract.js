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
 * @type ContractStartFn<
 * GovernedPublicFacet<{}>,
 * GovernedCreatorFacet<any>,
 * {
 *   electionManager: VoteOnParamChange,
 *   main: {
 *     MalleableNumber: ParamRecord<'nat'>,
 *     Electorate: ParamRecord<'amount'>,
 *   },
 * },
 * {initialPoserInvitation: Payment}>
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
      [MALLEABLE_NUMBER]: ['nat', numberParam.value],
      [CONTRACT_ELECTORATE]: ['invitation', initialPoserInvitation],
    },
    zcf.getZoeService(),
  );

  const { wrapPublicFacet, wrapCreatorFacet, getElectorate } =
    handleParamGovernance(zcf, paramManager);

  const invitationAmount = getElectorate();
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
