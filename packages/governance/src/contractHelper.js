// @ts-check

import { Far } from '@agoric/marshal';
import { sameStructure } from '@agoric/same-structure';

import { buildParamManager } from './paramManager.js';

const { details: X, quote: q } = assert;

/**
 * Helper for the 90% of contracts that will have only a single set of
 * parameters. In order to support managed parameters, a contract only has to
 *   * define the parameter template, which includes name, type and value
 *   * call handleParamGovernance() to get makePublicFacet and makeCreatorFacet
 *   * add any methods needed in the public and creator facets.
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

  const makePublicFacet = (originalPublicFacet = {}) => {
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

  /** @type {LimitedCreatorFacet} */
  const limitedCreatorFacet = Far('governedContract creator facet', {
    getContractGovernor: () => electionManager,
  });

  const makeCreatorFacet = (originalCreatorFacet = Far('creatorFacet', {})) => {
    return Far('creatorFacet', {
      getParamMgrRetriever: () => {
        return Far('paramRetriever', { get: () => paramManager });
      },
      getInternalCreatorFacet: () => originalCreatorFacet,
      getLimitedCreatorFacet: () => limitedCreatorFacet,
    });
  };

  return harden({
    makePublicFacet,
    makeCreatorFacet,
    getParamValue: name => paramManager.getParam(name).value,
  });
};
harden(handleParamGovernance);
export { handleParamGovernance };
