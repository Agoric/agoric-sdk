// @ts-check

import { details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import { setupGovernance, validateParamChangeBallot } from './governParam';
import { assertContractGovernance } from './validators';

/** @type {ValidateBallotDetails} */
const validateBallotDetails = async (zoe, registrar, details) => {
  const { handle, counterInstance } = details;
  validateParamChangeBallot(details);

  const {
    question: { contract: governedInstance },
  } = details;
  const governorInstance = await E.get(E(zoe).getTerms(governedInstance))
    .electionManager;
  const governorPublic = E(zoe).getPublicFacet(governorInstance);

  await assertContractGovernance(zoe, governedInstance, governorInstance);

  return Promise.all([
    E(governorPublic).validateBallotCounter(counterInstance),
    E(governorPublic).validateBallotRegistrar(handle, registrar),
    E(governorPublic).validateBallotTimer(details),
  ]);
};

/** @type {ValidateBallotFromCounter} */
const validateBallotFromCounter = async (zoe, registrar, ballotCounter) => {
  const counterPublicP = E(zoe).getPublicFacet(ballotCounter);
  const ballotDetails = await E(counterPublicP).getDetails();

  return validateBallotDetails(zoe, registrar, ballotDetails);
};

/*
 * ContractManager is an ElectionManager that starts up a contract and hands its
 * own creator a facet that allows them to call for votes on parameters that
 * were declared by the contract.
 *
 * ContractManager is initialized by a call to startGovernedInstance() on this
 * contract's creatorFacet. That call specifies the registrar, and identifies
 * the Installation to be started.
 *
 * The governedContract is responsible for supplying getParamMgrAccessor() in
 * its creatorFacet. getParamMgrAccessor() takes a ParamSpecification, which
 *  identifies the parameter to be voted on. A minimal ParamSpecification
 *  specifies the key which identifies a particular paramManager (even if
 *  there's only one) and the parameterName. The interpretation of
 *  ParamSpecification is up to the contract.
 *
 * The call to startGovernedInstance() returns a facet with voteOnParamChange(),
 * which is used to create ballot questions that will automatically update
 * contract parameters if passed. This facet will usually be closely held.
 *
 * The govened contract's terms include the instance of this (governing)
 *  contract (as electionManager) so clients will be able to look up the state
 *  of the governed parameters.
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  const zoe = zcf.getZoeService();
  let startedOnce = false;
  const { timer } = zcf.getTerms();

  // //// visible state of the governor; initialized when governed starts ////
  /** @type {PromiseRecord<Instance>} */
  const registrarPK = makePromiseKit();
  /** @type {PromiseRecord<Instance>} */
  const governedInstancePK = makePromiseKit();

  // a predicate that identifies ballots created by this governor
  /** @type {PromiseRecord<CreatedBallot>} */
  const createdBallotPK = makePromiseKit();

  /** @type {StartGovernedContract} */
  const startGovernedInstance = async (
    registrarCreatorFacet,
    governedContractInstallation,
    issuerKeywordRecord,
    customTerms,
  ) => {
    assert(!startedOnce, X`Governed contract can only be created once`);
    startedOnce = true;
    const poserInvitation = await E(registrarCreatorFacet).getPoserInvitation();
    registrarPK.resolve(
      E.get(E(zoe).getInvitationDetails(poserInvitation)).instance,
    );

    const augmentedTerms = {
      ...customTerms,
      electionManager: zcf.getInstance(),
    };

    const { creatorFacet, instance, publicFacet } = await E(zoe).startInstance(
      governedContractInstallation,
      issuerKeywordRecord,
      augmentedTerms,
    );
    governedInstancePK.resolve(instance);

    // don't give the ability to update params to anyone but governedContract.
    /** @type {Promise<LimitedCreatorFacet>} */
    const limitedCreatorFacet = E(creatorFacet).getLimitedCreatorFacet();

    const { voteOnParamChange, createdBallot } = await setupGovernance(
      E(creatorFacet).getParamMgrAccessor(),
      E(E(zoe).offer(poserInvitation)).getOfferResult(),
      instance,
      timer,
    );
    createdBallotPK.resolve(createdBallot);

    return Far('governedContract', {
      voteOnParamChange,
      getCreatorFacet: () => limitedCreatorFacet,
      getInstance: () => governedInstancePK.promise,
      getPublicFacet: () => publicFacet,
    });
  };

  const validateBallotCounter = async ballotCounter => {
    const createdBallot = await E(createdBallotPK.promise)(ballotCounter);
    assert(createdBallot, X`Ballot was not created by this contractGovernor`);
  };

  const validateBallotTimer = async details => {
    assert(
      details.closingRule.timer === timer,
      X`closing rule must use my timer`,
    );
  };

  const validateBallotRegistrar = async (ballotHandle, regP) => {
    const [reg, myRegistrar] = await Promise.all([regP, registrarPK.promise]);
    assert(reg === myRegistrar, X`Registrar doesn't match my Registrar`);
  };

  const creatorFacet = Far('governor creatorFacet', {
    startGovernedInstance,
  });

  const publicFacet = Far('contract governor public', {
    getRegistrar: () => registrarPK.promise,
    getGovernedContract: () => governedInstancePK.promise,
    validateBallotCounter,
    validateBallotRegistrar,
    validateBallotTimer,
  });

  return { creatorFacet, publicFacet };
};

harden(start);
harden(validateBallotDetails);
harden(validateBallotFromCounter);
export { start, validateBallotDetails, validateBallotFromCounter };
