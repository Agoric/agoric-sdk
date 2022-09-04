// @ts-check

import { Far } from '@endo/marshal';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { getMethodNames } from '@agoric/internal';
import { keyEQ, M } from '@agoric/store';
import { AmountShape, BrandShape } from '@agoric/ertp';
import { assertElectorateMatches } from './contractGovernance/paramManager.js';
import { makeParamManagerFromTerms } from './contractGovernance/typedParamManager.js';

const { details: X, quote: q } = assert;

export const GOVERNANCE_STORAGE_KEY = 'governance';

const publicMixinAPI = harden({
  getSubscription: M.call().returns(M.remotable('StoredSubscription')),
  getContractGovernor: M.call().returns(M.remotable('Instance')),
  getGovernedParams: M.call().returns(M.record()),
  getAmount: M.call().returns(AmountShape),
  getBrand: M.call().returns(BrandShape),
  getInstance: M.call().returns(M.remotable('Instance')),
  getInstallation: M.call().returns(M.remotable('Installation')),
  getInvitationAmount: M.call().returns(M.promise()),
  getNat: M.call().returns(M.bigint()),
  getRatio: M.call().returns(M.record()),
  getString: M.call().returns(M.string()),
  getUnknown: M.call().returns(M.string()),
});

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
    getSubscription() {
      return paramManager.getSubscription();
    },
    getContractGovernor() {
      return electionManager;
    },
    getGovernedParams() {
      return paramManager.getParams();
    },
  };

  /**
   * Add required methods to publicFacet
   *
   * @template {{}} PF public facet
   * @param {PF} originalPublicMethods
   * @returns {GovernedPublicFacet<PF>}
   */
  const augmentPublicFacet = originalPublicMethods => {
    return Far('publicFacet', {
      ...originalPublicMethods,
      ...commonPublicMethods,
      ...typedAccessors,
    });
  };

  /**
   * Add required methods to publicFacet, for a virtual/durable contract
   *
   * @param {OPF} originalPublicMethods
   * @template {{}} OPF
   */
  const augmentVirtualPublicFacet = originalPublicMethods => {
    return Far('publicFacet', {
      ...originalPublicMethods,
      ...commonPublicMethods,
      ...typedAccessors,
    });
  };

  /**
   * @template {{}} CF creator facet
   * @param {CF} originalCreatorKindMethods
   * @returns {LimitedCreatorFacet<CF>}
   */
  const makeLimitedCreatorKindMethods = originalCreatorKindMethods => {
    return harden({
      ...originalCreatorKindMethods,
      getContractGovernor: _context => electionManager,
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

  /**
   * @template {{}} CF
   * @param {CF} limitedCreatorFacet
   * @param {GovernedMethods} [governedMethods]
   * @returns {GovernorFacet<CF>}
   */
  const makeFarGovernorFacet = (limitedCreatorFacet, governedMethods = {}) => {
    const governorFacet = Far('governorFacet', {
      getParamMgrRetriever: () =>
        Far('paramRetriever', {
          get() {
            return paramManager;
          },
        }),
      getInvitation: name => paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet() {
        return limitedCreatorFacet;
      },
      // The contract provides a facet with the APIs that can be invoked by
      // governance
      /** @type {() => GovernedMethods} */
      // @-ts-expect-error TS think this is a RemotableBrand??
      getGovernedApis() {
        return Far('governedAPIs', governedMethods);
      },
      // The facet returned by getGovernedApis is Far, so we can't see what
      // methods it has. There's no clean way to have contracts specify the APIs
      // without also separately providing their names.
      getGovernedApiNames() {
        return Object.keys(governedMethods);
      },
      setOfferFilter(strings) {
        return zcf.setOfferFilter(strings);
      },
    });

    // exclusively for contractGovernor, which only reveals limitedCreatorFacet
    return governorFacet;
  };

  /**
   * @template {{}} CF
   * @param {CF} originalCreatorKindMethods
   * @param {{}} [governedApis]
   * @returns {GovernorFacet<CF>}
   */
  const makeGovernorFacet = (originalCreatorKindMethods, governedApis = {}) => {
    const limitedCreatorKindMethods = makeLimitedCreatorKindMethods(
      originalCreatorKindMethods,
    );
    return makeFarGovernorFacet(limitedCreatorKindMethods, governedApis);
  };

  /**
   * Add required methods to a creatorFacet for a virtual/durable contract.
   *
   * @param {{ [methodName: string]: (context?: unknown, ...rest: unknown[]) => unknown}} originalCreatorKindMethods
   */
  const makeVirtualGovernorKindMethodsKit = originalCreatorKindMethods => {
    const limitedCreatorKindMethods = makeLimitedCreatorKindMethods(
      originalCreatorKindMethods,
    );

    /** @type {import('@agoric/vat-data/src/types.js').FunctionsPlusContext<unknown, GovernorFacet<originalCreatorKindMethods>>} */
    const governorKindMethods = harden({
      getParamMgrRetriever: _context =>
        Far('paramRetriever', {
          get() {
            return paramManager;
          },
        }),
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
        getMethodNames(facets.governedApis || {}),
      setOfferFilter: (_context, strings) => zcf.setOfferFilter(strings),
    });

    return { governorKindMethods, limitedCreatorKindMethods };
  };

  return harden({
    publicMixin: {
      ...commonPublicMethods,
      ...typedAccessors,
    },
    creatorMixin: {
      getContractGovernor() {
        return electionManager;
      },
    },
    augmentPublicFacet,
    augmentVirtualPublicFacet,
    makeGovernorFacet,
    makeVirtualGovernorKindMethodsKit,
    makeFarGovernorFacet,
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

export { handleParamGovernance, publicMixinAPI };
