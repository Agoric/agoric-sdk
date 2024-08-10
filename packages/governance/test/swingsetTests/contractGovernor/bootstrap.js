import { q } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';

import {
  assertContractElectorate,
  CONTRACT_ELECTORATE,
} from '../../../src/index.js';
import { remoteNullMarshaller } from '../utils.js';
import { makeTerms, MALLEABLE_NUMBER } from './governedContract.js';

/**
 * @import {ContractGovernanceVoteResult, GovernedPublicFacetMethods, GovernorCreatorFacet, ParamChangesSpec, QuestionDetails, SimpleIssue, StandardParamPath} from '../../../src/types.js';
 */

/**
 * @param {ERef<ZoeService>} zoe
 * @param {(string:string) => undefined} log
 * @param {Record<string,Installation>} installations
 * @param {ERef<GovernorCreatorFacet<any>>} contractFacetAccess
 * @param {bigint} deadline
 */
const voteToChangeParameter = async (
  zoe,
  log,
  installations,
  contractFacetAccess,
  deadline,
) => {
  /** @type {ParamChangesSpec<StandardParamPath>} */
  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: { [MALLEABLE_NUMBER]: 299792458n },
  });

  const { details, instance, outcomeOfUpdate } = await E(
    contractFacetAccess,
  ).voteOnParamChanges(
    installations.binaryVoteCounter,
    deadline,
    paramChangeSpec,
  );

  E(E(zoe).getPublicFacet(instance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${q(outcome)}`))
    .catch(e => log(`vote failed ${e}`));

  E.when(outcomeOfUpdate, outcome => log(`updated to ${q(outcome)}`)).catch(e =>
    log(`update failed: ${e}`),
  );
  return { details, outcomeOfUpdate };
};

const installContracts = async (zoe, cb) => {
  const [committee, binaryVoteCounter, contractGovernor, governedContract] =
    await Promise.all([
      E(zoe).install(cb.committee),
      E(zoe).install(cb.binaryVoteCounter),
      E(zoe).install(cb.contractGovernor),
      E(zoe).install(cb.governedContract),
    ]);
  const installations = {
    committee,
    binaryVoteCounter,
    contractGovernor,
    governedContract,
  };
  return installations;
};

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Record<string, Installation>} installations
 * @param {Record<string, unknown>} electorateTerms
 * @returns {Promise<{electorateCreatorFacet: *, electorateInstance: Instance}>}
 */
const startElectorate = async (zoe, installations, electorateTerms) => {
  const { creatorFacet: electorateCreatorFacet, instance: electorateInstance } =
    await E(zoe).startInstance(installations.committee, {}, electorateTerms, {
      storageNode: makeMockChainStorageRoot().makeChildNode('thisElectorate'),
      marshaller: remoteNullMarshaller,
    });
  return { electorateCreatorFacet, electorateInstance };
};

const createVoters = async (electorateCreatorFacet, voterCreator) => {
  const invitations = await E(electorateCreatorFacet).getVoterInvitations();

  const aliceP = E(voterCreator).createVoter('Alice', invitations[0]);
  const bobP = E(voterCreator).createVoter('Bob', invitations[1]);
  const carolP = E(voterCreator).createVoter('Carol', invitations[2]);
  const daveP = E(voterCreator).createVoter('Dave', invitations[3]);
  const emmaP = E(voterCreator).createVoter('Emma', invitations[4]);
  return Promise.all([aliceP, bobP, carolP, daveP, emmaP]);
};

const votersVote = async (detailsP, votersP, selections) => {
  const [voters, details] = await Promise.all([votersP, detailsP]);
  const { positions, questionHandle } = details;

  await Promise.all(
    voters.map((v, i) => {
      return E(v).castBallotFor(questionHandle, positions[selections[i]]);
    }),
  );
};

/**
 * @param {ERef<import('./vat-voter.js').EVatVoter[]>} votersP
 * @param {ERef<QuestionDetails>} detailsP
 * @param {ERef<Instance>} governedInstanceP
 * @param {Instance} electorateInstance
 * @param {ERef<Instance>} governorInstanceP
 * @param {Record<string, Installation>} installations
 * @returns {Promise<void>}
 */
const oneVoterValidate = async (
  votersP,
  detailsP,
  governedInstanceP,
  electorateInstance,
  governorInstanceP,
  installations,
) => {
  const [voters, details, governedInstance, governorInstance] =
    await Promise.all([
      votersP,
      detailsP,
      governedInstanceP,
      governorInstanceP,
    ]);
  const { counterInstance } = details;

  return E(voters[0]).validate(
    counterInstance,
    governedInstance,
    electorateInstance,
    governorInstance,
    installations,
  );
};

const watchParams = async (zoe, contractInstanceP, log) => {
  const contractInstance = await contractInstanceP;
  /** @type {GovernedPublicFacetMethods} */
  const contractPublic = E(zoe).getPublicFacet(contractInstance);
  const subscription = await E(contractPublic).getSubscription();
  /** @type {any} */
  let prev = await E(contractPublic).getGovernedParams();
  const paramChangeObserver = Far('param observer', {
    updateState: ({ current }) => {
      const changed = [];
      if (
        prev.Electorate.value.value[0].handle !==
        current.Electorate.value.value[0].handle
      ) {
        changed.push('Electorate');
      }
      if (prev.MalleableNumber.value !== current.MalleableNumber.value) {
        changed.push('MalleableNumber');
      }
      log(`params update: `, changed.join(','));
      log(
        `current value of MalleableNumber is ${current.MalleableNumber.value}`,
      );
      prev = current;
    },
  });
  void observeIteration(subscribeEach(subscription), paramChangeObserver);
};

const setupParameterChanges = async (
  zoe,
  log,
  governor,
  installations,
  invitation,
  changes = { [CONTRACT_ELECTORATE]: invitation },
) => {
  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes,
  });
  /** @type {ContractGovernanceVoteResult} */
  const { details, instance, outcomeOfUpdate } = await E(
    governor,
  ).voteOnParamChanges(installations.binaryVoteCounter, 2n, paramChangeSpec);

  E(E(zoe).getPublicFacet(instance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${q(outcome)}`))
    .catch(e => log(`vote failed ${e}`));

  E.when(outcomeOfUpdate, outcome => log(`updated to (${q(outcome)})`)).catch(
    e => log(`update failed: ${e}`),
  );
  return { details, outcomeOfUpdate };
};

const setupOfferFilterChange = async (
  zoe,
  log,
  governor,
  installations,
  invitation,
  strings = ['foo', 'bar:'],
) => {
  const filterChangeSpec = harden(strings);
  /** @type {ContractGovernanceVoteResult} */
  const { details, instance, outcomeOfUpdate } = await E(
    governor,
  ).voteOnOfferFilter(installations.binaryVoteCounter, 2n, filterChangeSpec);

  E(E(zoe).getPublicFacet(instance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${q(outcome)}`))
    .catch(e => log(`vote failed ${e}`));

  E.when(outcomeOfUpdate, outcome => log(`updated to (${q(outcome)})`)).catch(
    e => log(`update failed: ${e}`),
  );
  return { details, outcomeOfUpdate };
};

const setupApiCall = async (zoe, log, governor, installations) => {
  const { details, instance, outcomeOfUpdate } = await E(
    governor,
  ).voteOnApiInvocation(
    'governanceApi',
    [], // empty params
    installations.binaryVoteCounter,
    2n,
  );

  E(E(zoe).getPublicFacet(instance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${q(outcome)}`))
    .catch(e => log(`vote failed ${e}`));

  E.when(outcomeOfUpdate, outcome => log(`update value: ${q(outcome)}`)).catch(
    e => log(`update failed: ${e}`),
  );
  return { details, outcomeOfUpdate };
};

const validateElectorateChange = async (
  zoe,
  log,
  voters1,
  detailsP,
  governorInstance,
  electorateInstance,
  publicFacet,
) => {
  const electorateValid = E(publicFacet).validateElectorate(electorateInstance);
  const details = await detailsP;
  const timerValid = E(publicFacet).validateTimer(details.closingRule);

  await assertContractElectorate(zoe, governorInstance, electorateInstance);

  await Promise.all([electorateValid, timerValid]);

  return log('Validation complete');
};

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  /** @type {{zoeService: ERef<ZoeService>}} */
  const { zoeService: zoe } = await E(vats.zoe).buildZoe(
    vatAdminSvc,
    undefined,
    'zcf',
  );
  const installations = await installContracts(zoe, cb);
  const timer = buildZoeManualTimer(log);
  const voterCreator = E(vats.voter).build(zoe);
  const firstElectorateTerms = {
    committeeName: 'TwentyCommittee',
    committeeSize: 5,
  };
  const {
    electorateCreatorFacet: firstElectorateCreatorFacet,
    electorateInstance: firstElectorateInstance,
  } = await startElectorate(zoe, installations, firstElectorateTerms);

  log(`=> voter and electorate vats are set up`);

  const initialPoserInvitation = await E(
    firstElectorateCreatorFacet,
  ).getPoserInvitation();
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationValue = await E(invitationIssuer).getAmountOf(
    initialPoserInvitation,
  );

  const terms = makeTerms(602214090000000000000000n, invitationValue);
  const governedContractTerms = {
    timer,
    governedContractInstallation: installations.governedContract,
    governed: {
      issuerKeywordRecord: {},
      terms,
    },
  };

  const { creatorFacet: governor, instance: governorInstance } = await E(
    zoe,
  ).startInstance(installations.contractGovernor, {}, governedContractTerms, {
    governed: {
      initialPoserInvitation,
    },
  });
  const governedInstance = E(governor).getInstance();
  const governedPF = E(governor).getPublicFacet();

  const [testName] = argv;
  switch (testName) {
    case 'contractGovernorStart': {
      await watchParams(zoe, governedInstance, log);
      E(governedPF)
        .getNum()
        .then(num => log(`Number before: ${num}`));

      const votersP = createVoters(firstElectorateCreatorFacet, voterCreator);
      const { details: detailsP, outcomeOfUpdate: outcome1 } =
        await voteToChangeParameter(zoe, log, installations, governor, 3n);
      await votersVote(detailsP, votersP, [0, 1, 1, 0, 0]);

      await oneVoterValidate(
        votersP,
        detailsP,
        governedInstance,
        firstElectorateInstance,
        governorInstance,
        installations,
      );

      await E(timer).tick();
      await E(timer).tick();
      await E(timer).tick();
      await outcome1;

      await E(governedPF)
        .getNum()
        .then(num => log(`Number after: ${num}`));
      break;
    }
    case 'changeElectorateStart': {
      await watchParams(zoe, governedInstance, log);
      const voters1 = createVoters(firstElectorateCreatorFacet, voterCreator);

      const secondElectorateTerms = {
        committeeName: 'ThirtyCommittee',
        committeeSize: 5,
      };
      const {
        electorateCreatorFacet: secondElectorateCreatorFacet,
        electorateInstance: secondElectorateInstance,
      } = await startElectorate(zoe, installations, secondElectorateTerms);
      const voters2 = createVoters(secondElectorateCreatorFacet, voterCreator);

      const newPoserInvitationP = E(
        secondElectorateCreatorFacet,
      ).getPoserInvitation();
      const [newPoserInvitation] = await Promise.all([newPoserInvitationP]);

      const { details: details1, outcomeOfUpdate: electorateOutcome } =
        await setupParameterChanges(
          zoe,
          log,
          governor,
          installations,
          newPoserInvitation,
        );

      await votersVote(details1, voters1, [1, 0, 0, 0, 1]);
      await E(timer).tick();
      await E(timer).tick();
      await electorateOutcome;

      await validateElectorateChange(
        zoe,
        log,
        voters1,
        details1,
        governorInstance,
        secondElectorateInstance,
        E(zoe).getPublicFacet(governorInstance),
      );

      const { details: details2, outcomeOfUpdate: outcome2 } =
        await voteToChangeParameter(zoe, log, installations, governor, 4n);
      await votersVote(details2, voters2, [0, 0, 1, 0, 1]);
      await E(timer).tick();
      await E(timer).tick();
      await outcome2;

      break;
    }
    case 'brokenUpdateStart': {
      await watchParams(zoe, governedInstance, log);
      const voters1 = createVoters(firstElectorateCreatorFacet, voterCreator);

      const secondElectorateTerms = {
        committeeName: 'ThirtyCommittee',
        committeeSize: 5,
      };
      const { electorateCreatorFacet: secondElectorateCreatorFacet } =
        await startElectorate(zoe, installations, secondElectorateTerms);

      const newPoserInvitationP = E(
        secondElectorateCreatorFacet,
      ).getPoserInvitation();
      const [newPoserInvitation] = await Promise.all([newPoserInvitationP]);

      const changes = {
        [MALLEABLE_NUMBER]: 42n,
        [CONTRACT_ELECTORATE]: newPoserInvitation,
      };
      const { details: details1, outcomeOfUpdate: electorateOutcome } =
        await setupParameterChanges(
          zoe,
          log,
          governor,
          installations,
          newPoserInvitation,
          changes,
        );
      await votersVote(details1, voters1, [1, 0, 0, 0, 1]);

      // The update will fail.
      await E(E(zoe).getInvitationIssuer()).burn(newPoserInvitation);

      await E(timer).tick();
      await E(timer).tick();
      void E.when(
        electorateOutcome,
        o => log(`vote (unexpected) successful outcome: ${o} `),
        e => log(`vote rejected outcome: ${e}`),
      );

      await validateElectorateChange(
        zoe,
        log,
        voters1,
        details1,
        governorInstance,
        // The electorate didn't change
        firstElectorateInstance,
        E(zoe).getPublicFacet(governorInstance),
      );

      break;
    }
    case 'changeTwoParams': {
      await watchParams(zoe, governedInstance, log);
      const voters1 = createVoters(firstElectorateCreatorFacet, voterCreator);

      const secondElectorateTerms = {
        committeeName: 'ThirtyCommittee',
        committeeSize: 5,
      };
      const {
        electorateCreatorFacet: secondElectorateCreatorFacet,
        electorateInstance: secondElectorateInstance,
      } = await startElectorate(zoe, installations, secondElectorateTerms);

      const newPoserInvitationP = E(
        secondElectorateCreatorFacet,
      ).getPoserInvitation();
      const [newPoserInvitation] = await Promise.all([newPoserInvitationP]);

      const changes = {
        [MALLEABLE_NUMBER]: 42n,
        [CONTRACT_ELECTORATE]: newPoserInvitation,
      };
      const { details: details1, outcomeOfUpdate: electorateOutcome } =
        await setupParameterChanges(
          zoe,
          log,
          governor,
          installations,
          newPoserInvitation,
          changes,
        );
      await votersVote(details1, voters1, [1, 0, 0, 0, 1]);

      await E(timer).tick();
      await E(timer).tick();
      void E.when(
        electorateOutcome,
        o => log(`successful outcome: ${q(o)} `),
        e => log(`vote (unexpected) rejected outcome: ${e}`),
      );

      await electorateOutcome;
      await validateElectorateChange(
        zoe,
        log,
        voters1,
        details1,
        governorInstance,
        secondElectorateInstance,
        E(zoe).getPublicFacet(governorInstance),
      );

      break;
    }
    case 'contractApiGovernanceStart': {
      E(governedPF)
        .getApiCalled()
        .then(called => log(`Number before: ${called}`));

      const voters1 = createVoters(firstElectorateCreatorFacet, voterCreator);
      const { details: details1, outcomeOfUpdate: electorateOutcome } =
        await setupApiCall(zoe, log, governor, installations);

      await votersVote(details1, voters1, [1, 0, 0, 0, 1]);
      await E(timer).tick();
      await E(timer).tick();
      await electorateOutcome;

      await E(governedPF)
        .getApiCalled()
        .then(called => log(`Number after: ${called}`));
      break;
    }
    case 'offerFilterGovernanceStart': {
      const voters = createVoters(firstElectorateCreatorFacet, voterCreator);
      const { details: details1, outcomeOfUpdate: electorateOutcome } =
        await setupOfferFilterChange(zoe, log, governor, installations);

      await votersVote(details1, voters, [1, 0, 0, 0, 1]);
      await E(timer).tick();
      await E(timer).tick();
      await electorateOutcome;

      await E(zoe)
        .getOfferFilter(governedInstance)
        .then(strings => log(`filters set: ${strings}`));
      break;
    }
    default:
      log(`didn't find test: ${argv}`);
  }
};

export const buildRootObject = (vatPowers, vatParameters) => {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
};
