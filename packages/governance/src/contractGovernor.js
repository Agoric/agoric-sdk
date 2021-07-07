// @ts-check

import { q, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { natSafeMath } from '@agoric/zoe/src/contractSupport';
import { makeWeakStore } from '@agoric/store';

import { ChoiceMethod, makeBallotSpec } from './ballotBuilder';

const { ceilDivide } = natSafeMath;

// verify that the parameters named as governedTerms in the governed contract's
// terms are known to the paramManager passed to governContract().
const parametersAreGoverned = async (zoe, governedInstance, mgr, name) => {
  const governedTermsP = E(zoe).getTerms(governedInstance);
  const paramDescriptionsP = E(mgr).getParams();
  const [governedTerms, paramDescriptions] = await Promise.all([
    governedTermsP,
    paramDescriptionsP,
  ]);

  const termsKeys = governedTerms.governedParams[name];
  const governedKeys = Object.getOwnPropertyNames(paramDescriptions);
  if (governedKeys.length !== termsKeys.length) {
    return false;
  }

  return termsKeys.every(k => governedKeys.includes(k));
};

/**
 * ContractGovernor is an ElectionManager that knows its Registrar, and provides
 * a facet that can be plugged into a contract to help create ballot questions
 * that will automatically update contract parameters if passed. The
 * contractGovernor might be re-used for multiple contracts that share the same
 * registrar (i.e. have the same electorate making decisions.)
 *
 * The governed contract will ordinarily import paramManager, and build a
 * paramManager instance, then call governContract() here to get a governor
 * facet that can be used to manage the contract's parameters. The contract
 * will then share the publicFacet of this governor to allow clients to see
 * the state of the governed parameters, and the creatorFacet to create
 * questions that will be submitted to a vote of the contract's electorate.
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  const { registrarInstance } = zcf.getTerms();
  // map from a managed contract instance to a list of ballotCounters.
  /** @type {WeakStore<Instance,Instance[]>} */
  const governedContracts = makeWeakStore('governedContract');
  let questionCreator;

  /*
   * The governor might be shared across multiple contracts, so the
   * contractInstance should be specified.
   */
  const createQuestionActual = async (
    paramMgr,
    governedInstance,
    name,
    proposedValue,
    ballotCounterInstallation,
    contractInstance,
    closingRule,
  ) => {
    assert(questionCreator, X`registrarCreator must be initialized.`);

    const positivePosition = `change ${name} to ${q(proposedValue)}.`;
    const negativePosition = `leave ${name} unchanged.`;

    const zoe = zcf.getZoeService();
    const { committeeSize } = await E(zoe).getTerms(registrarInstance);

    const ballotSpec = makeBallotSpec(
      ChoiceMethod.CHOOSE_N,
      `change value of ${name} in ${q(contractInstance)}?`,
      [positivePosition, negativePosition],
      1,
    );
    /** @type {BinaryBallotDetails} */
    const binaryBallotDetails = {
      ballotSpec,
      quorumThreshold: ceilDivide(committeeSize, 2),
      tieOutcome: negativePosition,
      closingRule,
    };

    const {
      publicFacet: counterPublicFacet,
      instance: ballotCounter,
    } = await E(questionCreator).addQuestion(
      ballotCounterInstallation,
      binaryBallotDetails,
    );

    const counters = governedContracts.get(governedInstance);
    counters.push(ballotCounter);
    governedContracts.set(governedInstance, counters);

    E(counterPublicFacet)
      .getOutcome()
      .then(outcome => {
        if (outcome === positivePosition) {
          E(paramMgr)[`update${name}`](proposedValue);
        }
        return outcome;
      })
      .catch(e => {
        throw Error(`Unable to update ${name} to ${proposedValue}: ${e}`);
      });
    return {
      ...binaryBallotDetails,
      instance: ballotCounter,
    };
  };

  /**
   * create a contractGovernor that will allow creation of ballot issues that
   * will change the value of parameters in the governed contract.
   *
   * @type {GovernContract}
   */
  const governContract = async (governedInstance, mgr, paramSet) => {
    const governed = await parametersAreGoverned(
      zcf.getZoeService(),
      governedInstance,
      mgr,
      paramSet,
    );
    assert(governed, X`All governed parameters must be mentioned in terms`);
    governedContracts.init(governedInstance, []);

    return Far('contract governor', {
      /** @type {CreateQuestion} */
      createQuestion: (
        name,
        proposedValue,
        ballotCounterInstallation,
        contractInstance,
        closingRule,
      ) => {
        assert(questionCreator, X`registrarCreator must be initialized.`);
        return createQuestionActual(
          mgr,
          governedInstance,
          name,
          proposedValue,
          ballotCounterInstallation,
          contractInstance,
          closingRule,
        );
      },
      getBallotCounters: () => governedContracts.get(governedInstance),
    });
  };

  const creatorFacet = Far('contract governor creator', {
    // The contractGovernor needs a private facet of the registrar for creating
    // questions, so it can't be provided in the Terms. Having a creatorFacet of
    // the governor accept the private facet of the registrar in an invitation
    // allows it to validate that it's the real thing.
    setRegistrar: async invitation => {
      assert(!questionCreator, X`registrarCreator can't be initialized twice.`);

      const instance = await E(zcf.getZoeService()).getInstance(invitation);
      assert(instance === registrarInstance, X`wrong instance`);
      const seat = E(zcf.getZoeService()).offer(invitation);
      questionCreator = await E(seat).getOfferResult();
      return questionCreator;
    },
  });

  const publicFacet = Far('contract governor public', {
    getRegistrar: () => registrarInstance,
    governsContract: i => governedContracts.has(i),
    // governContract could be on a private facet, but then users would have to
    // read and trust the contract to enforce that the instance in its terms was
    // for the same instance as the private facet it uses. Having it public
    // means anyone can ask the governor to manage other compatible contracts.
    governContract,
  });

  return { publicFacet, creatorFacet };
};
harden(start);
export { start };
