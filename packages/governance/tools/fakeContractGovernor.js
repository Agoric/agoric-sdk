import '../src/types-ambient.js';

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

// eslint-disable-next-line no-unused-vars
import { CONTRACT_ELECTORATE } from '../src/contractGovernance/governParam.js';

// @file fakeContractGovernor is a simplified copy of ContractGovernor to
// simplify testing. It has no electorate, and doesn't try to support
// legibility. It does try to ensure that the governed contract can get complete
// support for governance of parameters, apis, and filters. Tests should be able
// to update parameters directly.

/**
 * @template {() => {creatorFacet: GovernorFacet<any>, publicFacet: GovernedPublicFacetMethods} } SF Start function of governed contract
 * @param {ZCF<{
 *   timer: TimerService,
 *   governedContractInstallation: Installation<SF>,
 *   governed: {
 *     issuerKeywordRecord: IssuerKeywordRecord,
 *     terms: {governedParams: {[CONTRACT_ELECTORATE]: Amount<'set'>}},
 *     privateArgs: Record<string, unknown>,
 *   }
 * }>} zcf
 * @param {{
 *   governed: Record<string, unknown>
 * }} privateArgs
 */
const start = async (zcf, privateArgs) => {
  const zoe = zcf.getZoeService();
  const {
    governedContractInstallation,
    governed: {
      issuerKeywordRecord: governedIssuerKeywordRecord,
      terms: contractTerms,
    },
  } = zcf.getTerms();

  // in the fake there's no electionManager to augment the terms
  const augmentedTerms = contractTerms;

  const {
    creatorFacet: governedCF,
    instance: governedInstance,
    publicFacet: governedPF,
    adminFacet,
  } = await E(zoe).startInstance(
    governedContractInstallation,
    governedIssuerKeywordRecord,
    augmentedTerms,
    privateArgs.governed,
  );

  const paramMgrRetriever = E(governedCF).getParamMgrRetriever();

  // In this fake, the ability to update params is not closely held.
  const limitedCreatorFacet = E(governedCF).getLimitedCreatorFacet();

  /** @param {ParamChangesSpec<any>} paramSpec */
  const changeParams = paramSpec => {
    const paramMgr = E(paramMgrRetriever).get(paramSpec.paramPath);
    return E(paramMgr).updateParams(paramSpec.changes);
  };

  /** @param {Array<string>} strings */
  const setFilters = strings => E(governedCF).setOfferFilter(strings);

  /**
   * @param {string} apiMethodName
   * @param {unknown[]} methodArgs
   */
  const invokeAPI = (apiMethodName, methodArgs) =>
    E(E(governedCF).getGovernedApis())[apiMethodName](...methodArgs);

  const creatorFacet = Far('governor creatorFacet', {
    changeParams,
    invokeAPI,
    setFilters,
    getCreatorFacet: () => limitedCreatorFacet,
    getAdminFacet: () => adminFacet,
    getInstance: () => governedInstance,
    getPublicFacet: () => governedPF,
  });

  const publicFacet = Far('contract governor public', {
    getGovernedContract: () => governedInstance,
  });

  return { creatorFacet, publicFacet };
};

harden(start);
export { start };
