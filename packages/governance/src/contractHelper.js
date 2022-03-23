// @ts-check

import { Far } from '@endo/marshal';
import { keyEQ } from '@agoric/store';
// eslint-disable-next-line -- https://github.com/Agoric/agoric-sdk/pull/4837
import { CONTRACT_ELECTORATE } from './contractGovernance/governParam.js';
import { assertElectorateMatches } from './contractGovernance/paramManager.js';

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
 * @param {ZCF<{
 *   electionManager: VoteOnParamChange,
 *   main: Record<string, ParamRecord> & {[CONTRACT_ELECTORATE]: ParamRecord<'invitation'>}
 * }>} zcf
 * @param {import('./contractGovernance/typedParamManager').TypedParamManager<T>} paramManager
 */
const handleParamGovernance = (zcf, paramManager) => {
  const terms = zcf.getTerms();
  const governedParams = terms.main;
  assert(
    keyEQ(governedParams, paramManager.getParams()),
    X`Terms must include ${q(paramManager.getParams())}, but were ${q(
      governedParams,
    )}`,
  );
  assertElectorateMatches(paramManager, governedParams);

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

  const { electionManager } = terms;

  /**
   * @template {{}} PF public facet
   * @param {PF} originalPublicFacet
   * @returns {GovernedPublicFacet<PF>}
   */
  const wrapPublicFacet = originalPublicFacet => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      getSubscription: () => paramManager.getSubscription(),
      getContractGovernor: () => electionManager,
      getGovernedParams: () => paramManager.getParams(),
      ...typedAccessors,
    });
  };

  /**
   * @template {GovernableCreatorFacet} CF creator facet
   * @param {ERef<CF>} originalCreatorFacet
   * @returns {ERef<LimitedCreatorFacet<CF>>}
   */
  const makeLimitedCreatorFacet = originalCreatorFacet => {
    return Far('governedContract creator facet', {
      ...originalCreatorFacet,
      getContractGovernor: () => electionManager,
    });
  };

  /**
   * @template {GovernableCreatorFacet} CF creator facet
   * @param {ERef<CF>} originalCreatorFacet
   * @param {Record<string, (...args: any[]) => any>} governedApis
   * @returns { ERef<GovernedCreatorFacet<CF>> }
   */
  const wrapCreatorFacet = (originalCreatorFacet, governedApis = {}) => {
    const limitedCreatorFacet = makeLimitedCreatorFacet(originalCreatorFacet);

    // exclusively for contractGovernor, which only reveals limitedCreatorFacet
    return Far('creatorFacet', {
      // @ts-expect-error special case
      getParamMgrRetriever: () => {
        return Far('paramRetriever', { get: () => paramManager });
      },
      getInvitation: name => paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: () => limitedCreatorFacet,
      getGovernedApis: () => Far('governedAPIs', governedApis),
      getGovernedApiNames: () => Object.keys(governedApis),
    });
  };

  return harden({
    wrapPublicFacet,
    wrapCreatorFacet,
    ...paramManager.readonly(),
  });
};
harden(handleParamGovernance);

export { handleParamGovernance };
