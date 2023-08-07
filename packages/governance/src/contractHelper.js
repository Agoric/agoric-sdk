import { Far } from '@endo/marshal';
import { objectMap } from '@agoric/internal';
import { ignoreContext, prepareExo } from '@agoric/vat-data';
import { keyEQ, M } from '@agoric/store';
import { E } from '@endo/eventual-send';

import {
  assertElectorateMatches,
  makeParamManagerFromTerms,
} from './contractGovernance/paramManager.js';
import { GovernorFacetI } from './typeGuards.js';

const { Fail, quote: q } = assert;

export const GOVERNANCE_STORAGE_KEY = 'governance';

/**
 * @param {ZCF<GovernanceTerms<{}> & {}>} zcf
 * @param {import('./contractGovernance/paramManager').ParamManager<any>} paramManager
 */
export const validateElectorate = (zcf, paramManager) => {
  const { governedParams } = zcf.getTerms();
  return E.when(paramManager.getParamDescriptions(), async finishedParams => {
    try {
      keyEQ(governedParams, finishedParams) ||
        Fail`The 'governedParams' term must be an object like ${q(
          governedParams,
        )}, but was ${q(finishedParams)}`;
      return assertElectorateMatches(paramManager, governedParams);
    } catch (err) {
      zcf.shutdownWithFailure(err);
    }
  });
};
harden(validateElectorate);

/**
 * Utility function for `makeParamGovernance`.
 *
 * @template {import('./contractGovernance/paramManager.js').ParamTypesMap} T
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {ZCF<GovernanceTerms<{}> & {}>} zcf
 * @param {import('./contractGovernance/paramManager').ParamManager<T>} paramManager
 */
const facetHelpers = (baggage, zcf, paramManager) => {
  const commonPublicMethods = {
    getParamDescriptions: () => paramManager.getParamDescriptions(),
    getPublicTopics: () => paramManager.getPublicTopics(),
    getGovernedParams: () => paramManager.getParamDescriptions(),
  };

  const { behavior, guards } = paramManager.accessors();

  /**
   * Add required methods to publicFacet, for a durable contract
   *
   * @template {{}} OPF
   * @param {OPF} originalPublicFacet
   * @param {Record<string, Pattern>} [publicFacetGuards]
   */
  const augmentPublicFacet = (
    originalPublicFacet,
    publicFacetGuards = undefined,
  ) => {
    const compiledGuards = publicFacetGuards
      ? harden({ ...publicFacetGuards, ...guards })
      : undefined;
    return prepareExo(
      baggage,
      'publicFacet',
      compiledGuards,
      harden({
        ...originalPublicFacet,
        ...commonPublicMethods,
        ...objectMap(behavior, ignoreContext),
      }),
    );
  };

  /**
   * @template {{}} CF
   * @param {CF} limitedCreatorFacet
   * @param {Record<string, (...any) => unknown>} [governedApis]
   * @returns {GovernedCreatorFacet<CF>}
   */
  const makeGovernorFacet = (limitedCreatorFacet, governedApis = {}) => {
    const governorFacet = prepareExo(baggage, 'governorFacet', GovernorFacetI, {
      getParamMgrRetriever: () =>
        Far('paramRetriever', { get: () => paramManager }),
      getInvitation: name => paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: () => limitedCreatorFacet,
      // The contract provides a facet with the APIs that can be invoked by
      // governance
      /** @type {() => GovernedApis} */
      getGovernedApis: () => Far('governedAPIs', governedApis),
      // The facet returned by getGovernedApis is Far, so we can't see what
      // methods it has. There's no clean way to have contracts specify the APIs
      // without also separately providing their names.
      getGovernedApiNames: () => Object.keys(governedApis),
      setOfferFilter: strings => zcf.setOfferFilter(strings),
    });

    // exclusively for contractGovernor, which only reveals limitedCreatorFacet
    return governorFacet;
  };

  const makeParamReaderFacet = () => {
    return prepareExo(
      baggage,
      'ParamReader',
      M.interface('ParamReader', guards),
      behavior,
    );
  };

  return harden({
    publicMixin: {
      ...commonPublicMethods,
      ...behavior,
    },
    publicMixinGuards: {
      getParamDescriptions: M.call().returns(M.any()),
      getGovernedParams: M.call().returns(M.any()),
      getPublicTopics: M.call().returns(M.promise()),
      ...guards,
    },
    augmentPublicFacet,
    makeGovernorFacet,

    params: makeParamReaderFacet(),
  });
};

/**
 * @typedef {object} TypesAndValues
 * @property {string} type
 * @property {any} value
 */

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
 * @template {import('./contractGovernance/paramManager').ParamTypesMap} M
 *   Map of types of custom governed terms
 * @param {ZCF<GovernanceTerms<M>>} zcf
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {Invitation} initialPoserInvitation
 * @param {M} paramTypesMap
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 * @param {StorageNode} storageNode
 */
export const handleParamGovernance = (
  zcf,
  baggage,
  initialPoserInvitation,
  paramTypesMap,
  makeRecorderKit,
  storageNode,
) => {
  const paramManager = makeParamManagerFromTerms(
    makeRecorderKit(storageNode),
    zcf,
    baggage,
    { Electorate: initialPoserInvitation },
    paramTypesMap,
    'Contract paramManager',
  );

  return facetHelpers(baggage, zcf, paramManager);
};
harden(handleParamGovernance);
