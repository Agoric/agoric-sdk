// @ts-check

import { makeStoredPublisherKit } from '@agoric/notifier';
import { handleParamGovernance } from '../../../src/contractHelper.js';
import { ParamTypes } from '../../../src/index.js';
import { CONTRACT_ELECTORATE } from '../../../src/contractGovernance/governParam.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

const makeTerms = (number, invitationAmount) => {
  return harden({
    governedParams: {
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
 * GovernanceTerms<{
 *   MalleableNumber: 'nat',
 * }>,
 * {initialPoserInvitation: Payment}>
 */
const start = async (zcf, privateArgs) => {
  const { augmentPublicFacet, makeGovernorFacet, params } =
    await handleParamGovernance(
      makeStoredPublisherKit(),
      zcf,
      privateArgs.initialPoserInvitation,
      {
        [MALLEABLE_NUMBER]: ParamTypes.NAT,
      },
    );

  let governanceAPICalled = 0;
  const governanceApi = () => (governanceAPICalled += 1);
  return {
    publicFacet: augmentPublicFacet({
      getNum: () => params.getMalleableNumber(),
      getApiCalled: () => governanceAPICalled,
    }),
    creatorFacet: makeGovernorFacet({}, { governanceApi }),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);
harden(makeTerms);

export { start, MALLEABLE_NUMBER, makeTerms };
