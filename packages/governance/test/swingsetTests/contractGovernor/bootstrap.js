// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { observeIteration } from '@agoric/notifier';
import { makeParamTerms } from './governedContract.js';

const { quote: q } = assert;

/**
 * @param {ERef<ZoeService>} zoe
 * @param {(string:string) => undefined} log
 * @param {Record<string,Installation>} installations
 * @param {ERef<GovernedContractFacetAccess>} contractFacetAccess
 * @returns {Promise<*>}
 */
const contractGovernorStart = async (
  zoe,
  log,
  installations,
  contractFacetAccess,
) => {
  const { details, instance, outcomeOfUpdate } = await E(
    contractFacetAccess,
  ).voteOnParamChange(
    { key: 'main', parameterName: 'MalleableNumber' },
    299792458n,
    installations.binaryVoteCounter,
    3n,
  );

  E(E(zoe).getPublicFacet(instance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${q(outcome)}`))
    .catch(e => log(`vote failed ${e}`));

  E.when(outcomeOfUpdate, outcome => log(`updated to ${q(outcome)}`)).catch(e =>
    log(`update failed: ${e}`),
  );
  return details;
};

const installContracts = async (zoe, cb) => {
  const [
    committee,
    binaryVoteCounter,
    contractGovernor,
    governedContract,
  ] = await Promise.all([
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

const startElectorate = async (zoe, installations) => {
  const electorateTerms = {
    committeeName: 'TwentyCommittee',
    committeeSize: 5,
  };
  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installations.committee, {}, electorateTerms);
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

const oneVoterValidate = async (
  votersP,
  detailsP,
  governedInstanceP,
  electorateInstance,
  governorInstanceP,
  installations,
  timer,
) => {
  const [
    voters,
    details,
    governedInstance,
    governorInstance,
  ] = await Promise.all([
    votersP,
    detailsP,
    governedInstanceP,
    governorInstanceP,
  ]);
  const { counterInstance } = details;

  E(voters[0]).validate(
    counterInstance,
    governedInstance,
    electorateInstance,
    governorInstance,
    installations,
    timer,
  );
};

const checkContractState = async (zoe, contractInstanceP, log) => {
  const contractInstance = await contractInstanceP;
  const contractPublic = E(zoe).getPublicFacet(contractInstance);
  let paramValues = await E(contractPublic).getGovernedParams();
  const subscription = await E(contractPublic).getSubscription();
  const paramChangeObserver = Far('param observer', {
    updateState: update => {
      log(`${update.name} was changed to ${q(update.value)}`);
    },
  });
  observeIteration(subscription, paramChangeObserver);

  // it takes a while for the update to propagate. The second time it seems good
  paramValues = await E(contractPublic).getGovernedParams();
  const malleableNumber = paramValues.MalleableNumber;

  log(`current value of MalleableNumber is ${malleableNumber.value}`);
};

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  /** @type { ERef<ZoeService> } */
  const zoe = E(vats.zoe).buildZoe(vatAdminSvc);
  const installations = await installContracts(zoe, cb);
  const timer = buildManualTimer(log);
  const voterCreator = E(vats.voter).build(zoe);
  const { electorateCreatorFacet, electorateInstance } = await startElectorate(
    zoe,
    installations,
  );

  log(`=> voter and electorate vats are set up`);

  const initialPoserInvitation = E(electorateCreatorFacet).getPoserInvitation();

  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationValue = await E(invitationIssuer).getAmountOf(
    initialPoserInvitation,
  );

  const terms = {
    timer,
    electorateInstance,
    governedContractInstallation: installations.governedContract,
    governed: {
      issuerKeywordRecord: {},
      terms: {
        main: makeParamTerms(602214090000000000000000n, invitationValue),
      },
      privateArgs: { initialPoserInvitation },
    },
  };

  const { creatorFacet: governor, instance: governorInstance } = await E(
    zoe,
  ).startInstance(installations.contractGovernor, {}, terms);
  const governedInstance = E(governor).getInstance();

  const [testName] = argv;
  switch (testName) {
    case 'contractGovernorStart': {
      const votersP = createVoters(electorateCreatorFacet, voterCreator);
      const detailsP = contractGovernorStart(zoe, log, installations, governor);
      await votersVote(detailsP, votersP, [0, 1, 1, 0, 0]);

      await oneVoterValidate(
        votersP,
        detailsP,
        governedInstance,
        electorateInstance,
        governorInstance,
        installations,
        timer,
      );

      await E(timer).tick();
      await E(timer).tick();
      await E(timer).tick();

      await checkContractState(zoe, governedInstance, log);
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
