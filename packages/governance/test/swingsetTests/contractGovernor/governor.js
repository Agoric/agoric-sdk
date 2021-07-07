// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { setupGovernance } from './governParam';

/** @type {ContractStartFn} */
const start = async zcf => {
  const zoe = zcf.getZoeService();

  const startGovernedInstance = async (
    registrar,
    governedContractInstallation,
    issuerKeywordRecord,
    customTerms,
  ) => {
    const { creatorFacet, instance: governedInstance } = await E(
      zoe,
    ).startInstance(
      governedContractInstallation,
      issuerKeywordRecord,
      customTerms,
    );

    /** @type {Promise<ParamManagerFull>} */
    const paramManager = E(creatorFacet).getParamManager();

    // connect the vote outcome to the paramManager
    const setParamByVoting = setupGovernance(paramManager, registrar);
    return Far('setParamByVoting', {
      setParamByVoting,
    });
  };

  const creatorFacet = Far('governor creatorFacet', {
    startGovernedInstance,
  });
  return { creatorFacet };
};
harden(start);
export { start };
