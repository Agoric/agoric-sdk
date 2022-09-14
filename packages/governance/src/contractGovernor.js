// @ts-check

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { fit } from '@agoric/store';

import {
  CONTRACT_ELECTORATE,
  setupParamGovernance,
} from './contractGovernance/governParam.js';
import { setupApiGovernance } from './contractGovernance/governApi.js';
import { setupFilterGovernance } from './contractGovernance/governFilter.js';
import { ParamChangesQuestionDetailsShape } from './typeGuards.js';

const { details: X } = assert;

/**
 * Validate that the question details correspond to a parameter change question
 * that the electorate hosts, and that the voteCounter and other details are
 * consistent with it.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} electorate
 * @param {ParamChangeIssueDetails} details
 */
const validateQuestionDetails = async (zoe, electorate, details) => {
  const {
    counterInstance,
    issue: { contract: governedInstance },
  } = details;
  fit(details, ParamChangesQuestionDetailsShape);

  const governorInstance = await E.get(E(zoe).getTerms(governedInstance))
    .electionManager;
  /** @type {Promise<GovernorPublic>} */
  const governorPublic = E(zoe).getPublicFacet(governorInstance);

  return Promise.all([
    E(governorPublic).validateVoteCounter(counterInstance),
    E(governorPublic).validateElectorate(electorate),
    E(governorPublic).validateTimer(details.closingRule),
  ]);
};

/**
 * Validate that the questions counted by the voteCounter correspond to a
 * parameter change question that the electorate hosts, and that the
 * voteCounter and other details are consistent.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} electorate
 * @param {Instance} voteCounter
 */
const validateQuestionFromCounter = async (zoe, electorate, voteCounter) => {
  const counterPublicP = E(zoe).getPublicFacet(voteCounter);
  const questionDetails = await E(counterPublicP).getDetails();

  return validateQuestionDetails(zoe, electorate, questionDetails);
};

/**
 * @typedef {StandardTerms} ContractGovernorTerms
 * @property {TimerService} timer
 * @property {Instance} electorateInstance
 * @property {Installation} governedContractInstallation
 */

/**
 * ContractGovernor is an ElectionManager that starts up a contract and hands
 * its own creator a facet that allows them to manage that contract's APIs,
 * offer filters, and parameters.
 *
 * The terms for this contract include the Timer, Electorate and
 * the Installation to be started, as well as an issuerKeywordRecord or terms
 * needed by the governed contract. Those details for the governed contract are
 * included in this contract's terms as a "governed" record. If the contract
 * expects privateArgs, those will be provided in this contract's `privateArgs`
 * under 'governed:'.
 *
 * terms = {
 *    timer,
 *    electorateInstance,
 *    governedContractInstallation,
 *    governed: { issuerKeywordRecord, terms },
 * };
 *
 * The governedContract is responsible for supplying getParamMgrRetriever() in
 * its creatorFacet. getParamMgrRetriever() takes a ParamSpecification, which
 * identifies the parameter to be voted on. A minimal ParamSpecification
 * specifies the key which identifies a particular paramManager (even if there's
 * only one) and the parameterName. The interpretation of ParamSpecification is
 * up to the contract.
 *
 * The contractGovernor creatorFacet includes `voteOnParamChanges`,
 * `voteOnFilter`, and `voteOnApiInvocation`. `voteOnParamChanges` is used to
 * create questions that will automatically update contract parameters if
 * passed. `voteOnFilter` can be used to create questions that will prevent the
 * exercise of certain invitations if passed. `voteOnApiInvocation` creates
 * questions that will invoke pre-defined APIs in the contract.
 *
 * This facet will usually be closely held. The creatorFacet can also be used to
 * retrieve the governed instance, publicFacet, and its creatorFacet with
 * the voteOn*() methods omitted.
 *
 * The governed contract's terms include the instance of this (governing)
 * contract (as electionManager) so clients will be able to look up the state
 * of the governed parameters.
 *
 * template {{}} PF Public facet of governed
 * template {ContractPowerfulCreatorFacet} CF Creator facet of governed
 * type {ContractStartFn<
 * GovernorPublic,
 * GovernedContractFacetAccess<PF,CF>,
 * {
 *   timer: TimerService,
 *   electorateInstance: Instance,
 *   governedContractInstallation: Installation<CF>,
 *   governed: {
 *     issuerKeywordRecord: IssuerKeywordRecord,
 *     terms: {governedParams: {[CONTRACT_ELECTORATE]: Amount<'set'>}},
 *     privateArgs: Record<string, unknown>,
 *   }
 * }>}
 */

/**
 * @template {() => {creatorFacet: GovernorFacet<any>, publicFacet: GovernedPublicFacetMethods} } SF Start function of governed contract
 * @param {ZCF<{
 *   timer: TimerService,
 *   electorateInstance: Instance,
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
    timer,
    governedContractInstallation,
    governed: {
      issuerKeywordRecord: governedIssuerKeywordRecord,
      terms: contractTerms,
    },
  } = zcf.getTerms();
  contractTerms.governedParams[CONTRACT_ELECTORATE] ||
    assert.fail(
      X`Contract must declare ${CONTRACT_ELECTORATE} as a governed parameter`,
    );

  const augmentedTerms = harden({
    ...contractTerms,
    electionManager: zcf.getInstance(),
  });

  const {
    creatorFacet: governedCF,
    instance: governedInstance,
    publicFacet: governedPF,
    adminFacet,
  } = await E(zoe).startInstance(
    governedContractInstallation,
    governedIssuerKeywordRecord,
    // @ts-expect-error XXX governance types
    augmentedTerms,
    privateArgs.governed,
  );

  /** @type {() => Promise<Instance>} */
  const getElectorateInstance = async () => {
    const invitationAmount = await E(governedPF).getInvitationAmount(
      CONTRACT_ELECTORATE,
    );
    return invitationAmount.value[0].instance;
  };

  // CRUCIAL: only contractGovernor should get the ability to update params
  const limitedCreatorFacet = E(governedCF).getLimitedCreatorFacet();

  let currentInvitation;
  let poserFacet;
  /** @type {() => Promise<PoserFacet>} */
  const getUpdatedPoserFacet = async () => {
    const newInvitation = await E(
      E(E(governedCF).getParamMgrRetriever()).get({ key: 'governedParams' }),
    ).getInternalParamValue(CONTRACT_ELECTORATE);

    if (newInvitation !== currentInvitation) {
      poserFacet = E(E(zoe).offer(newInvitation)).getOfferResult();
      currentInvitation = newInvitation;
    }
    return poserFacet;
  };
  await getUpdatedPoserFacet();
  assert(poserFacet, 'question poser facet must be initialized');

  // All governed contracts have at least a governed electorate
  const { voteOnParamChanges, createdQuestion: createdParamQuestion } =
    await setupParamGovernance(
      zoe,
      E(governedCF).getParamMgrRetriever(),
      governedInstance,
      timer,
      getUpdatedPoserFacet,
    );

  const { voteOnFilter, createdFilterQuestion } = await setupFilterGovernance(
    zoe,
    governedInstance,
    timer,
    getUpdatedPoserFacet,
    governedCF,
  );

  // this conditional was extracted so both sides are equally asynchronous
  /** @type {() => Promise<ApiGovernor>} */
  const initApiGovernance = async () => {
    const [governedApis, governedNames] = await Promise.all([
      E(governedCF).getGovernedApis(),
      E(governedCF).getGovernedApiNames(),
    ]);
    if (governedNames.length) {
      return setupApiGovernance(
        zoe,
        governedInstance,
        governedApis,
        governedNames,
        timer,
        getUpdatedPoserFacet,
      );
    }

    // if we aren't governing APIs, voteOnApiInvocation shouldn't be called
    return {
      voteOnApiInvocation: () => {
        throw Error('api governance not configured');
      },
      createdQuestion: () => false,
    };
  };

  const { voteOnApiInvocation, createdQuestion: createdApiQuestion } =
    await initApiGovernance();

  const validateVoteCounter = async voteCounter => {
    const createdParamQ = await E(createdParamQuestion)(voteCounter);
    const createdApiQ = await E(createdApiQuestion)(voteCounter);
    const createdFilterQ = await E(createdFilterQuestion)(voteCounter);

    assert(
      createdParamQ || createdApiQ || createdFilterQ,
      'VoteCounter was not created by this contractGovernor',
    );
    return true;
  };

  /** @param {ClosingRule} closingRule */
  const validateTimer = closingRule => {
    assert(closingRule.timer === timer, 'closing rule must use my timer');
    return true;
  };

  const validateElectorate = async regP => {
    return E.when(regP, async reg => {
      const electorateInstance = await getElectorateInstance();
      assert(
        reg === electorateInstance,
        "Electorate doesn't match my Electorate",
      );
      return true;
    });
  };

  const creatorFacet = Far('governor creatorFacet', {
    voteOnParamChanges,
    voteOnApiInvocation,
    voteOnOfferFilter: voteOnFilter,
    getCreatorFacet: () => limitedCreatorFacet,
    getAdminFacet: () => adminFacet,
    getInstance: () => governedInstance,
    getPublicFacet: () => governedPF,
  });

  const publicFacet = Far('contract governor public', {
    getElectorate: getElectorateInstance,
    getGovernedContract: () => governedInstance,
    validateVoteCounter,
    validateElectorate,
    validateTimer,
  });

  return { creatorFacet, publicFacet };
};

harden(start);
harden(validateQuestionDetails);
harden(validateQuestionFromCounter);
export { start, validateQuestionDetails, validateQuestionFromCounter };
