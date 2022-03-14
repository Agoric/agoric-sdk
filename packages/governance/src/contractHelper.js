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
 * @template T
 * @param {ContractFacet<{electionManager: VoteOnParamChange, main: Record<string, ParamRecord>}>} zcf
 * @param {import('./paramGovernance/typedParamManager').TypedParamManager<T>} paramManager
 */
const handleParamGovernance = (zcf, paramManager) => {
  const terms = zcf.getTerms();
  const governedParams = terms.main;
  const { electionManager } = terms;

  assert(
    keyEQ(governedParams, paramManager.getParams()),
    X`Terms must include ${q(paramManager.getParams())}, but were ${q(
      governedParams,
    )}`,
  );

  /**
   * @template PF
   * @param {PF} originalPublicFacet
   * @returns {GovernedPublicFacet<T, PF>}
   */
  const wrapPublicFacet = (originalPublicFacet = /** @type {PF} */ ({})) => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      getSubscription: () => paramManager.getSubscription(),
      getContractGovernor: () => electionManager,
      getGovernedParams: () => paramManager.getParams(),
      ...paramManager.asGetters(),
    });
  };

  /**
   * @template CF
   * @param {CF} originalCreatorFacet
   * @returns {CF & LimitedCreatorFacet}
   */
  const makeLimitedCreatorFacet = originalCreatorFacet => {
    return Far('governedContract creator facet', {
      ...originalCreatorFacet,
      getContractGovernor: () => electionManager,
    });
  };

  /**
   * @template CF
   * @param {CF} originalCreatorFacet
   * @returns { GovernedCreatorFacet<CF> }
   */
  const wrapCreatorFacet = (
    originalCreatorFacet = Far('creatorFacet', /** @type {CF} */ ({})),
  ) => {
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
    ...paramManager.asGetters(),
  });
};
harden(handleParamGovernance);

export { handleParamGovernance };
