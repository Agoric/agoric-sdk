// @ts-check

import { handleParamGovernance } from '../../../src/contractHelper.js';
import {
  assertElectorateMatches,
  makeParamManager,
  ParamTypes,
} from '../../../src/index.js';
import { CONTRACT_ELECTORATE } from '../../../src/contractGovernance/governParam.js';

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
const start = async (zcf, privateArgs) => {
  const {
    main: { [MALLEABLE_NUMBER]: numberParam, ...otherGovernedTerms },
  } = zcf.getTerms();
  const { initialPoserInvitation } = privateArgs;

  const paramManager = await makeParamManager(
    {
      [MALLEABLE_NUMBER]: ['nat', numberParam.value],
      [CONTRACT_ELECTORATE]: ['invitation', initialPoserInvitation],
    },
    zcf.getZoeService(),
  );

  const { wrapPublicFacet, wrapCreatorFacet } = handleParamGovernance(
    zcf,
    paramManager,
  );

  assertElectorateMatches(paramManager, otherGovernedTerms);

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
