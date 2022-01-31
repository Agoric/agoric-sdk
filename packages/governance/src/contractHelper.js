// @ts-check

import { Far } from '@endo/marshal';
import { keyEQ } from '@agoric/store';

const { details: X, quote: q } = assert;

/**
 * Helper for the 90% of contracts that will have only a single set of
 * parameters. In order to support managed parameters, a contract only has to
 *   - define the parameter template, which includes name, type and value
 *   - call handleParamGovernance() to get wrapPublicFacet and wrapCreatorFacet
 *   - add any methods needed in the public and creator facets.
 *
 *  It's also crucial that the governed contract not interact with the product
 *  of wrapCreatorFacet(). The wrapped creatorFacet has the power to change
 *  parameter values, and the governance guarantees only hold if they're not
 *  used directly by the governed contract.
 *
 * @param {ContractFacet} zcf
 * @param {ParamManagerFull} paramManager
 * @returns {ParamGovernorBundle}
 */
const handleParamGovernance = (zcf, paramManager) => {
  const terms = zcf.getTerms();
  /** @type {ParamDescriptions} */
  const governedParams = terms.main;
  const { electionManager } = terms;

  assert(
    keyEQ(governedParams, paramManager.getParams()),
    X`Terms must include ${q(paramManager.getParams())}, but were ${q(
      governedParams,
    )}`,
  );

  const typedAccessors = {
    getAmount: paramManager.getAmount,
    getBrand: paramManager.getBrand,
    getInstance: paramManager.getInstance,
    getInstallation: paramManager.getInstallation,
    getInvitationAmount: paramManager.getInvitationAmount,
    getNat: paramManager.getNat,
    getRatio: paramManager.getRatio,
    getString: paramManager.getString,
    getUnknown: paramManager.getUnknown,
  };

  const wrapPublicFacet = (originalPublicFacet = {}) => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      getSubscription: () => paramManager.getSubscription(),
      getContractGovernor: () => electionManager,
      /** @type {GetGovernedVaultParams} */
      // @ts-expect-error we know this ParamManagerFull is really a GetGovernedVaultParams
      getGovernedParams: () => paramManager.getParams(),
      ...typedAccessors,
    });
  };

  const makeLimitedCreatorFacet = originalCreatorFacet => {
    return Far('governedContract creator facet', {
      ...originalCreatorFacet,
      getContractGovernor: () => electionManager,
    });
  };

  const wrapCreatorFacet = (originalCreatorFacet = Far('creatorFacet', {})) => {
    const limitedCreatorFacet = makeLimitedCreatorFacet(originalCreatorFacet);

    // exclusively for contractGovernor, which only reveals limitedCreatorFacet
    return Far('creatorFacet', {
      getParamMgrRetriever: () => {
        return Far('paramRetriever', { get: () => paramManager });
      },
      getInvitation: name => paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: () => limitedCreatorFacet,
    });
  };

  return harden({
    wrapPublicFacet,
    wrapCreatorFacet,
    ...typedAccessors,
  });
};
harden(handleParamGovernance);

export { handleParamGovernance };
