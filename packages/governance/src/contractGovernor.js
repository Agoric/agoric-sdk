// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import { setupGovernance } from './governParam.js';
import {
  validateQuestionFromCounter,
  validateQuestionDetails,
  makeValidateVoteCounter,
  makeValidateTimer,
  makeValidateElectorate,
} from './validators.js';

const { details: X } = assert;

/*
 * ContractManager is an ElectionManager that starts up a contract and hands its
 * own creator a facet that allows them to call for votes on parameters that
 * were declared by the contract.
 *
 * The terms for this contract include the Timer, Electorate and
 * the Installation to be started, as well as an issuerKeywordRecord or terms
 * needed by the governed contract. Those details for the governed contract are
 * included in this contract's terms as a "governed" record.
 *
 * terms = {
 *    timer,
 *    electorateInstance,
 *    governedContractInstallation,
 *    governed: {
 *      issuerKeywordRecord: governedIssuerKeywordRecord,
 *      terms: governedTerms,
 *    },
 * };
 *
 * The governedContract is responsible for supplying getParamMgrRetriever() in
 * its creatorFacet. getParamMgrRetriever() takes a ParamSpecification, which
 * identifies the parameter to be voted on. A minimal ParamSpecification
 * specifies the key which identifies a particular paramManager (even if there's
 * only one) and the parameterName. The interpretation of ParamSpecification is
 * up to the contract.
 *
 * The contractGovenor creatorFacet includes voteOnParamChange(),
 * which is used to create questions that will automatically update
 * contract parameters if passed. This facet will usually be closely held. The
 * creatorFacet can also be used to retrieve the governed instance, publicFacet,
 * and it's creatorFacet with voteOnParamChange() omitted.
 *
 * The governed contract's terms include the instance of this (governing)
 * contract (as electionManager) so clients will be able to look up the state
 * of the governed parameters.
 *
 * @type {ContractStartFn}
 */
const start = async (zcf, privateArgs) => {
  const zoe = zcf.getZoeService();
  const {
    timer,
    electorateInstance,
    governedContractInstallation,
    governed: {
      issuerKeywordRecord: governedIssuerKeywordRecord,
      terms: governedTerms,
      privateArgs: privateContractArgs,
    },
  } = /** @type {ContractGovernorTerms} */ zcf.getTerms();

  const { electorateCreatorFacet } = privateArgs;

  const augmentedTerms = harden({
    ...governedTerms,
    electionManager: zcf.getInstance(),
  });
  const poserInvitation = E(electorateCreatorFacet).getPoserInvitation();

  const [
    {
      creatorFacet: governedCF,
      instance: governedInstance,
      publicFacet: governedPF,
    },
    invitationDetails,
  ] = await Promise.all([
    E(zoe).startInstance(
      governedContractInstallation,
      governedIssuerKeywordRecord,
      augmentedTerms,
      privateContractArgs,
    ),
    E(zoe).getInvitationDetails(poserInvitation),
  ]);

  assert(
    invitationDetails.instance === electorateInstance,
    X`questionPoserInvitation didn't match supplied Electorate`,
  );

  // CRUCIAL: only governedContract should get the ability to update params
  /** @type {Promise<LimitedCreatorFacet>} */
  const limitedCreatorFacet = E(governedCF).getLimitedCreatorFacet();

  const { voteOnParamChange, createdQuestion } = await setupGovernance(
    E(governedCF).getParamMgrRetriever(),
    E(E(zoe).offer(poserInvitation)).getOfferResult(),
    governedInstance,
    timer,
  );

  /** @type {GovernedContractFacetAccess} */
  const creatorFacet = Far('governor creatorFacet', {
    voteOnParamChange,
    getCreatorFacet: () => limitedCreatorFacet,
    getInstance: () => governedInstance,
    getPublicFacet: () => governedPF,
  });

  /** @type {GovernorPublic} */
  const publicFacet = Far('contract governor public', {
    getElectorate: () => electorateInstance,
    getGovernedContract: () => governedInstance,
    validateVoteCounter: makeValidateVoteCounter(createdQuestion),
    validateElectorate: makeValidateElectorate(electorateInstance),
    validateTimer: makeValidateTimer(timer),
  });

  return { creatorFacet, publicFacet };
};

harden(start);
export { start, validateQuestionFromCounter, validateQuestionDetails };
