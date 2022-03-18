// @ts-check

import { handleParamGovernance } from '../../../src/contractHelper.js';
import {
  assertElectorateMatches,
  makeParamManager,
  ParamTypes,
} from '../../../src/index.js';
import { CONTRACT_ELECTORATE } from '../../../src/contractGovernance/governParam.js';
import { makeParamManagerFromTerms } from '../../../src/contractGovernance/typedParamManager.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

const makeTerms = (number, invitationAmount) => {
  return harden({
    main: {
      [MALLEABLE_NUMBER]: { type: ParamTypes.NAT, value: number },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    },
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
 *     Electorate: ParamRecord<'invitation'>,
 *   },
 * },
 * {initialPoserInvitation: Payment}>
 */
// XXX passing full zcf and privateArgs simplifies the caller but isn't POLA
const start = async (zcf, privateArgs) => {
  const paramManager = await makeParamManagerFromTerms(zcf, privateArgs, {
    [MALLEABLE_NUMBER]: 'nat',
    [CONTRACT_ELECTORATE]: 'invitation',
  });

  // ??? call this within makeParamManagerFromTerms ?
  assertElectorateMatches(paramManager, zcf.getTerms().main);

  const { wrapPublicFacet, wrapCreatorFacet } = handleParamGovernance(
    zcf,
    paramManager,
  );

  let governanceAPICalled = 0;
  const governanceApi = () => (governanceAPICalled += 1);
  return {
    publicFacet: wrapPublicFacet({
      getNum: () => paramManager.getMalleableNumber(),
      getApiCalled: () => governanceAPICalled,
    }),
    creatorFacet: wrapCreatorFacet({}, { governanceApi }),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);
harden(makeTerms);

export { start, MALLEABLE_NUMBER, makeTerms };
