// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { governedParameterTerms } from './governedContract';

const contractGovernorStart = async (
  zoe,
  timer,
  log,
  installations,
  governorPublic,
  governedInstance,
  governedCreator,
) => {
  const rule = {
    timer,
    deadline: 3n,
  };

  const governor = await E(governedCreator).getContractGovernor();
  E(governorPublic)
    .governsContract(governedInstance)
    .then(doesGovern => {
      log(`Governor recognizes governed: ${doesGovern}`);
    });

  const details = await E(governor).createQuestion(
    'MalleableNumber',
    299792458n,
    installations.binaryBallotCounter,
    governedInstance,
    rule,
  );

  const counters = await E(governor).getBallotCounters();
  E(E(zoe).getPublicFacet(counters[0]))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${outcome}`))
    .catch(e => log(`vote failed ${e}`));
  return details;
};

const installContracts = async (zoe, cb) => {
  const [
    committeeRegistrar,
    binaryBallotCounter,
    contractGovernor,
    governedContract,
  ] = await Promise.all([
    E(zoe).install(cb.committeeRegistrar),
    E(zoe).install(cb.binaryBallotCounter),
    E(zoe).install(cb.contractGovernor),
    E(zoe).install(cb.governedContract),
  ]);
  const installations = {
    committeeRegistrar,
    binaryBallotCounter,
    contractGovernor,

    governedContract,
  };
  return installations;
};

const startRegistrar = async (zoe, installations) => {
  const registrarTerms = { committeeName: 'TwentyCommittee', committeeSize: 5 };
  const {
    creatorFacet: committeeCreator,
    instance: registrarInstance,
  } = await E(zoe).startInstance(
    installations.committeeRegistrar,
    {},
    registrarTerms,
  );
  return { committeeCreator, registrarInstance };
};

const startGovernor = async (
  registrarInstance,
  zoe,
  installations,
  committeeCreator,
) => {
  const governorTerms = { registrarInstance };
  const {
    instance: governorInstance,
    publicFacet: governorPublicFacet,
    creatorFacet,
  } = await E(zoe).startInstance(
    installations.contractGovernor,
    {},
    governorTerms,
  );

  await E(creatorFacet).setRegistrar(
    E(committeeCreator).getQuestionInvitation(),
  );

  return { governorPublicFacet, governorInstance };
};

const createCommittee = async (committeeCreator, voterCreator) => {
  const invitations = await E(committeeCreator).getVoterInvitations();

  const aliceP = E(voterCreator).createVoter('Alice', invitations[0]);
  const bobP = E(voterCreator).createVoter('Bob', invitations[1]);
  const carolP = E(voterCreator).createVoter('Carol', invitations[2]);
  const daveP = E(voterCreator).createVoter('Dave', invitations[3]);
  const emmaP = E(voterCreator).createVoter('Emma', invitations[4]);
  return Promise.all([aliceP, bobP, carolP, daveP, emmaP]);
};

const votersVote = async (detailsP, votersP, selections) => {
  const [voters, details] = await Promise.all([votersP, detailsP]);
  const {
    ballotSpec: { question, positions },
  } = details;
  await Promise.all(
    voters.map((v, i) => {
      return E(v).castBallotFor(question, positions[selections[i]]);
    }),
  );
};

const oneVoterValidate = async (
  votersP,
  detailsP,
  governedInstance,
  registrarInstance,
  governorInstance,
) => {
  const [voters, details] = await Promise.all([votersP, detailsP]);
  const { instance } = details;

  E(voters[0]).validate(
    instance,
    governedInstance,
    registrarInstance,
    governorInstance,
  );
};

const checkContractState = async (zoe, timer, contractInstance, log) => {
  const contractPublic = E(zoe).getPublicFacet(contractInstance);
  let state = await E(contractPublic).getState();

  // it takes a while for the update to propagate. The second time it seems good
  state = await E(contractPublic).getState();
  log(`current value of ${state.name} is ${state.value}`);
};

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  const zoe = E(vats.zoe).buildZoe(vatAdminSvc);
  const installations = await installContracts(zoe, cb);
  const timer = buildManualTimer(log);
  const voterCreator = E(vats.voter).build(zoe);
  const { committeeCreator, registrarInstance } = await startRegistrar(
    zoe,
    installations,
  );

  log(`=> voter and registrar vats are set up`);
  const { governorPublicFacet, governorInstance } = await startGovernor(
    registrarInstance,
    zoe,
    installations,
    committeeCreator,
  );

  const governedParams = governedParameterTerms;
  const governedTerms = { electionManager: governorInstance, governedParams };

  const {
    instance: governedInstance,
    publicFacet: _governedPublicFacet,
    creatorFacet: governedCreator,
  } = await E(zoe).startInstance(
    installations.governedContract,
    {},
    governedTerms,
  );

  const [testName] = argv;
  switch (testName) {
    case 'contractGovernorStart': {
      const votersP = createCommittee(committeeCreator, voterCreator);
      const detailsP = contractGovernorStart(
        zoe,
        timer,
        log,
        installations,
        governorPublicFacet,
        governedInstance,
        governedCreator,
      );
      await votersVote(detailsP, votersP, [0, 1, 1, 0, 0]);
      await oneVoterValidate(
        votersP,
        detailsP,
        governedInstance,
        registrarInstance,
        governorInstance,
      );

      await E(timer).tick();
      await E(timer).tick();
      await E(timer).tick();

      await checkContractState(zoe, timer, governedInstance, log);
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
