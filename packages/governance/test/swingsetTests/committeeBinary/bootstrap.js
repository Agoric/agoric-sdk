// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';

import {
  ChoiceMethod,
  makeBallotSpec,
  QuorumRule,
  ElectionType,
} from '../../../src/ballotBuilder';

const makeVoterVat = async (log, vats, zoe) => {
  const voterCreator = E(vats.voter).build(zoe);
  log(`=> voter vat is set up`);
  return voterCreator;
};

const addQuestion = async (qDetails, closingTime, tools, quorumRule) => {
  const { registrarFacet, installations } = tools;
  const { question, positions, electionType } = qDetails;
  const closingRule = {
    timer: tools.timer,
    deadline: 3n,
  };

  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    question,
    positions,
    electionType,
    1,
  );
  const ballotDetails = {
    ballotSpec,
    closingRule,
    quorumRule,
  };
  const { instance: ballotInstance, publicFacet } = await E(
    registrarFacet,
  ).addQuestion(installations.binaryBallotCounter, ballotDetails);
  return { ballotInstance, ballotPublic: publicFacet };
};

const committeeBinaryStart = async (
  zoe,
  voterCreator,
  timer,
  log,
  installations,
) => {
  const registrarTerms = { committeeName: 'TheCommittee', committeeSize: 5 };
  const { creatorFacet: registrarFacet, instance: registrarInstance } = await E(
    zoe,
  ).startInstance(installations.committeeRegistrar, {}, registrarTerms);

  const choose = 'Choose';
  const electionType = ElectionType.SURVEY;
  const details = {
    question: choose,
    positions: ['Eeny', 'Meeny'],
    electionType,
  };
  const tools = { registrarFacet, installations, timer };
  const { ballotInstance } = await addQuestion(
    details,
    3n,
    tools,
    QuorumRule.HALF,
  );

  const invitations = await E(registrarFacet).getVoterInvitations();
  const details2 = await E(zoe).getInvitationDetails(invitations[2]);

  log(
    `invitation details check: ${details2.instance === registrarInstance} ${
      details2.description
    }`,
  );

  const aliceP = E(voterCreator).createVoter('Alice', invitations[0], 'Eeny');
  const bobP = E(voterCreator).createVoter('Bob', invitations[1], 'Meeny');
  const carolP = E(voterCreator).createVoter('Carol', invitations[2], 'Eeny');
  const daveP = E(voterCreator).createVoter('Dave', invitations[3], 'Eeny');
  const emmaP = E(voterCreator).createVoter('Emma', invitations[4], 'Meeny');
  const [alice] = await Promise.all([aliceP, bobP, carolP, daveP, emmaP]);

  // At least one voter should verify that everything is on the up-and-up
  const instances = { registrarInstance, ballotInstance };
  await E(alice).verifyBallot(choose, instances);

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  const publicFacet = E(zoe).getPublicFacet(ballotInstance);
  await E(publicFacet)
    .getOutcome()
    .then(outcome => log(`vote outcome: ${outcome}`))
    .catch(e => log(`vote failed ${e}`));
};

const committeeBinaryTwoQuestions = async (
  zoe,
  voterCreator,
  timer,
  log,
  installations,
) => {
  log('starting TWO questions test');

  const registrarTerms = { committeeName: 'TheCommittee', committeeSize: 5 };
  const { creatorFacet: registrarFacet, instance: registrarInstance } = await E(
    zoe,
  ).startInstance(installations.committeeRegistrar, {}, registrarTerms);

  const invitations = await E(registrarFacet).getVoterInvitations();
  const details2 = await E(zoe).getInvitationDetails(invitations[2]);

  log(
    `invitation details check: ${details2.instance === registrarInstance} ${
      details2.description
    }`,
  );

  const tools = { registrarFacet, installations, timer };
  const twoPotato = 'Two Potato';
  const onePotato = 'One Potato';
  const choose = 'Choose';
  const howHigh = 'How high?';
  const oneFoot = '1 foot';
  const twoFeet = '2 feet';

  const aliceP = E(voterCreator).createMultiVoter('Alice', invitations[0], [
    [choose, onePotato],
    [howHigh, oneFoot],
  ]);
  const bobP = E(voterCreator).createMultiVoter('Bob', invitations[1], [
    [choose, onePotato],
    [howHigh, twoFeet],
  ]);
  const carolP = E(voterCreator).createMultiVoter('Carol', invitations[2], [
    [choose, twoPotato],
    [howHigh, oneFoot],
  ]);
  const daveP = E(voterCreator).createMultiVoter('Dave', invitations[3], [
    [choose, onePotato],
    [howHigh, oneFoot],
  ]);
  const emmaP = E(voterCreator).createMultiVoter('Emma', invitations[4], [
    [choose, onePotato],
    [howHigh, twoFeet],
  ]);

  const potato = {
    question: choose,
    positions: [onePotato, twoPotato],
    electionType: ElectionType.SURVEY,
  };
  const { ballotInstance: potatoBallotInstance } = await addQuestion(
    potato,
    3n,
    tools,
    QuorumRule.HALF,
  );

  const height = {
    question: howHigh,
    positions: [oneFoot, twoFeet],
    electionType: ElectionType.SURVEY,
  };
  const { ballotInstance: heightBallotInstance } = await addQuestion(
    height,
    4n,
    tools,
    QuorumRule.HALF,
  );

  const [alice, bob] = await Promise.all([aliceP, bobP, carolP, daveP, emmaP]);
  // At least one voter should verify that everything is on the up-and-up
  await E(alice).verifyBallot(choose, {
    registrarInstance,
    ballotInstance: potatoBallotInstance,
  });
  await E(bob).verifyBallot(howHigh, {
    registrarInstance,
    ballotInstance: heightBallotInstance,
  });

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  await E(E(zoe).getPublicFacet(potatoBallotInstance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${outcome}`))
    .catch(e => log(`vote failed ${e}`));

  await E(E(zoe).getPublicFacet(heightBallotInstance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${outcome}`))
    .catch(e => log(`vote failed ${e}`));
};

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  const zoe = E(vats.zoe).buildZoe(vatAdminSvc);

  const [committeeRegistrar, binaryBallotCounter] = await Promise.all([
    E(zoe).install(cb.committeeRegistrar),
    E(zoe).install(cb.binaryBallotCounter),
  ]);
  const timer = buildManualTimer(log);

  const installations = { committeeRegistrar, binaryBallotCounter };

  const voterCreator = await makeVoterVat(log, vats, zoe);

  const [testName] = argv;
  switch (testName) {
    case 'committeeBinaryStart':
      committeeBinaryStart(zoe, voterCreator, timer, log, installations);
      break;
    case 'committeeBinaryTwoQuestions':
      committeeBinaryTwoQuestions(zoe, voterCreator, timer, log, installations);
      break;
    default:
      log(`didn't find test: ${argv}`);
  }
};

export const buildRootObject = (vatPowers, vatParameters) => {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
};
