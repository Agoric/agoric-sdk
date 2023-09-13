import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';

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
 * @param {ZCF<GovernanceTerms<{ MalleableNumber: "nat"; }>>} zcf
 * @param {{
 *   governed: Record<string, unknown>,
 *   marshaller: Marshaller,
 *   initialPoserInvitation: Invitation,
 *   storageNode: StorageNode,
 * }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
const start = async (zcf, privateArgs, baggage) => {
  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    privateArgs.marshaller,
  );

  const { augmentPublicFacet, makeGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      baggage,
      privateArgs.initialPoserInvitation,
      {
        [MALLEABLE_NUMBER]: ParamTypes.NAT,
      },
      makeRecorderKit,
      privateArgs.storageNode,
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
