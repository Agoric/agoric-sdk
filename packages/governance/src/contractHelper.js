// @ts-check

import { Far } from '@endo/marshal';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { keyEQ } from '@agoric/store';
import { objectMap, ignoreContext } from '@agoric/vat-data';
import { assertElectorateMatches } from './contractGovernance/paramManager.js';
import { makeParamManagerFromTerms } from './contractGovernance/typedParamManager.js';

const { details: X, quote: q } = assert;

export const GOVERNANCE_STORAGE_KEY = 'governance';

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

  const commonPublicMethods = {
    getSubscription: () => paramManager.getSubscription(),
    getContractGovernor: () => electionManager,
    getGovernedParams: () => paramManager.getParams(),
  };

  /**
   * Add required methods to publicFacet
   *
   * @template {{}} PF public facet
   * @param {PF} originalPublicFacet
   * @returns {GovernedPublicFacet<PF>}
   */
  const augmentPublicFacet = originalPublicFacet => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      ...commonPublicMethods,
      ...typedAccessors,
    });
  };

  /**
   * Add required methods to publicFacet, for a virtual/durable contract
   *
   * @param {OPF} originalPublicFacet
   * @template {{}} OPF
   */
  const augmentVirtualPublicFacet = originalPublicFacet => {
    return Far('publicFacet', {
      ...originalPublicFacet,
      ...commonPublicMethods,
      ...objectMap(typedAccessors, ignoreContext),
    });
  };

  /**
   * @template {{}} CF creator facet
   * @param {CF} originalCreatorFacet
   * @returns {LimitedCreatorFacet<CF>}
   */
  const makeLimitedCreatorFacet = originalCreatorFacet => {
    return Far('governedContract creator facet', {
      ...originalCreatorFacet,
      getContractGovernor: () => electionManager,
    });
  };

  /**
   * Add required methods to a creatorFacet
   *
   * @template {{}} CF creator facet
   * @param {CF} originalCreatorFacet
   * @param {Record<string, (...args: any[]) => any>} governedApis
   * @returns {GovernedCreatorFacet<CF>}
   */
  const makeGovernorFacet = (originalCreatorFacet, governedApis = {}) => {
    const limitedCreatorFacet = makeLimitedCreatorFacet(originalCreatorFacet);
    const governorFacet = Far('governorFacet', {
      getParamMgrRetriever: () =>
        Far('paramRetriever', { get: () => paramManager }),
      getInvitation: (_context, name) =>
        paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: () => limitedCreatorFacet,
      // The contract provides a facet with the APIs that can be invoked by
      // governance
      getGovernedApis: () => Far('governedAPIs', governedApis),
      // The facet returned by getGovernedApis is Far, so we can't see what
      // methods it has. There's no clean way to have contracts specify the APIs
      // without also separately providing their names.
      getGovernedApiNames: () => Object.keys(governedApis),
    });

    // exclusively for contractGovernor, which only reveals limitedCreatorFacet
    return governorFacet;
  };

  /**
   * Add required methods to a creatorFacet for a virtual/durable contract.
   *
   * @param {{ [methodName: string]: (context?: unknown, ...rest: unknown[]) => unknown}} originalCreatorFacet
   */
  const makeVirtualGovernorFacet = originalCreatorFacet => {
    const limitedCreatorFacet = makeLimitedCreatorFacet(originalCreatorFacet);

    const governorFacet = Far('governorFacet', {
      getParamMgrRetriever: () =>
        Far('paramRetriever', { get: () => paramManager }),
      getInvitation: (_context, name) =>
        paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: ({ facets }) => facets.limitedCreatorFacet,
      // The contract provides a facet with the APIs that can be invoked by
      // governance
      getGovernedApis: ({ facets }) => facets.governedApis,
      // The facet returned by getGovernedApis is Far, so we can't see what
      // methods it has. There's no clean way to have contracts specify the APIs
      // without also separately providing their names.
      getGovernedApiNames: ({ facets }) =>
        Object.keys(facets.governedApis || {}),
    });

    return { governorFacet, limitedCreatorFacet };
  };

  return harden({
    augmentPublicFacet,
    augmentVirtualPublicFacet,
    makeGovernorFacet,
    makeVirtualGovernorFacet,
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
 * @param {ZCF<GovernanceTerms<M>>} zcf
 * @param {Invitation} initialPoserInvitation
 * @param {M} paramTypesMap
 * @param {ERef<StorageNode>} [storageNode]
 * @param {ERef<Marshaller>} [marshaller]
 */
const handleParamGovernance = async (
  zcf,
  initialPoserInvitation,
  paramTypesMap,
  storageNode,
  marshaller,
) => {
  /** @type {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} */
  const publisherKit = makeStoredPublisherKit(
    storageNode,
    marshaller,
    GOVERNANCE_STORAGE_KEY,
  );
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
