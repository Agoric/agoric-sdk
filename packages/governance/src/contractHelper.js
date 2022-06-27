// @ts-check

import { Far } from '@endo/marshal';
import { keyEQ } from '@agoric/store';
// eslint-disable-next-line -- https://github.com/Agoric/agoric-sdk/pull/4837
import { CONTRACT_ELECTORATE } from './contractGovernance/governParam.js';
import { assertElectorateMatches } from './contractGovernance/paramManager.js';
import { makeParamManagerFromTerms } from './contractGovernance/typedParamManager.js';

const { details: X, quote: q } = assert;

/**
 * Utility function for `makeParamGovernance`.
 *
 * @template T
 * @param {ZCF<GovernanceTerms<{}> & {}>} zcf
 * @param {import('./contractGovernance/typedParamManager').TypedParamManager<T>} paramManager
 */
const facetHelpers = (zcf, paramManager) => {
  const terms = zcf.getTerms();
  const { governedParams } = terms;
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
  const augmentPublicFacet = originalPublicFacet => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      getSubscription: () => paramManager.getSubscription(),
      getContractGovernor: () => electionManager,
      getGovernedParams: () => paramManager.getParams(),
      ...typedAccessors,
    });
  };

  /**
   * @template {{}} CF creator facet
   * @param {CF} originalCreatorFacet
   * @returns {ERef<LimitedCreatorFacet<CF>>}
   */
  const makeLimitedCreatorFacet = originalCreatorFacet => {
    return Far('governedContract creator facet', {
      ...originalCreatorFacet,
      getContractGovernor: () => electionManager,
    });
  };

  /**
   * @template {{}} CF creator facet
   * @param {ERef<CF>} originalCreatorFacet
   * @param {Record<string, (...args: any[]) => any>} governedApis
   * @returns {ERef<GovernedCreatorFacet<CF>>}
   */
  const makeGovernorFacet = (originalCreatorFacet, governedApis = {}) => {
    const limitedCreatorFacet = makeLimitedCreatorFacet(originalCreatorFacet);

    // exclusively for contractGovernor, which only reveals limitedCreatorFacet
    return Far('governorFacet', {
      // @ts-expect-error special case
      getParamMgrRetriever: () => {
        return Far('paramRetriever', { get: () => paramManager });
      },
      getInvitation: name => paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: () => limitedCreatorFacet,
      // The contract provides a facet with the APIs that can be invoked by
      // governance
      getGovernedApis: () => Far('governedAPIs', governedApis),
      // The facet returned by getGovernedApis is Far, so we can't see what
      // methods it has. There's no clean way to have contracts specify the APIs
      // without also separately providing their names.
      getGovernedApiNames: () => Object.keys(governedApis),
    });
  };

  return harden({
    augmentPublicFacet,
    makeGovernorFacet,
    params: paramManager.readonly(),
  });
};

/**
 * Helper for the 90% of contracts that will have only a single set of
 * parameters. Using this for managed parameters, a contract only has to
 *
 * - Define the parameter template, which includes name, type and value
 * - Add any methods needed in the public and creator facets.
 *
 * It's also crucial that the governed contract not interact with the product of
 * makeGovernorFacet(). The wrapped creatorFacet has the power to change
 * parameter values, and the governance guarantees only hold if they're not used
 * directly by the governed contract.
 *
 * @template {import('./contractGovernance/typedParamManager').ParamTypesMap} M
 *   Map of types of custom governed terms
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {ZCF<GovernanceTerms<M>>} zcf
 * @param {Invitation} initialPoserInvitation
 * @param {M} paramTypesMap
 */
const handleParamGovernance = async (
  publisherKit,
  zcf,
  initialPoserInvitation,
  paramTypesMap,
) => {
  const paramManager = await makeParamManagerFromTerms(
    publisherKit,
    zcf,
    initialPoserInvitation,
    paramTypesMap,
  );

  return facetHelpers(zcf, paramManager);
};

harden(handleParamGovernance);

export { handleParamGovernance };
