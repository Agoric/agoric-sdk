// @ts-check

import { Far } from '@agoric/marshal';
import { sameStructure } from '@agoric/same-structure';

import { buildParamManager } from './paramManager.js';

const { details: X, quote: q } = assert;

/**
 * Helper for the 90% of contracts that will have only a single set of
 * parameters. In order to support managed parameters, a contract only has to
 *   * define the parameter template, which includes name, type and value
 *   * call handleParamGovernance() to get wrapPublicFacet and wrapCreatorFacet
 *   * add any methods needed in the public and creator facets.
 *
 *   It's also crucial that the governed contract not interact with the product
 *   of wrapCreatorFacet(). The wrapped creatorFacet has the power to change
 *   parameter values, and the governance guarantees only hold if they're not
 *   used directly by the governed contract.
 *
 *  @type {HandleParamGovernance}
 */
const handleParamGovernance = (zcf, governedParamsTemplate) => {
  const terms = zcf.getTerms();
  /** @type {ParamDescriptions} */
  const governedParams = terms.main;
  const { electionManager } = terms;

  assert(
    sameStructure(governedParams, governedParamsTemplate),
    X`Terms must include ${q(governedParamsTemplate)}, but were ${q(
      governedParams,
    )}`,
  );
  const paramManager = buildParamManager(governedParams);

  const wrapPublicFacet = (originalPublicFacet = {}) => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      getSubscription: () => paramManager.getSubscription(),
      getContractGovernor: () => electionManager,
      getGovernedParams: () => {
        return paramManager.getParams();
      },
      getParamValue: name => paramManager.getParam(name).value,
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
    return Far('creatorFacet', {
      getParamMgrRetriever: () => {
        return Far('paramRetriever', { get: () => paramManager });
      },
      getLimitedCreatorFacet: () => limitedCreatorFacet,
    });
  };

  return harden({
    wrapPublicFacet,
    wrapCreatorFacet,
    getParamValue: name => paramManager.getParam(name).value,
  });
};
harden(handleParamGovernance);
export { handleParamGovernance };
