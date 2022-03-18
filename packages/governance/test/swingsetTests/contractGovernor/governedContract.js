// @ts-check

import { assert } from '@agoric/assert';
import { Far } from '@endo/far';

import { handleParamGovernance } from '../../../src/contractHelper.js';
import {
  assertElectorateMatches,
  makeParamManager,
  ParamTypes,
} from '../../../src/index.js';
import { CONTRACT_ELECTORATE } from '../../../src/contractGovernance/governParam.js';

const { details: X } = assert;

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
    governedApis: ['governanceApi'],
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
 *   governedApis: ['governanceApi'],
 * },
 * {initialPoserInvitation: Payment}>
 */
const start = async (zcf, privateArgs) => {
  const {
    main: { [MALLEABLE_NUMBER]: numberParam, ...otherGovernedTerms },
    governedApis,
  } = zcf.getTerms();
  const { initialPoserInvitation } = privateArgs;

  assert(
    Array.isArray(governedApis) &&
      governedApis.length === 1 &&
      governedApis.includes('governanceApi'),
    X`terms must declare "governanceApi" as a governed API`,
  );

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
    creatorFacet: wrapCreatorFacet({
      getGovernedApis: () => Far('governedAPIs', { governanceApi }),
    }),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);
harden(makeTerms);

export { start, MALLEABLE_NUMBER, makeTerms };
