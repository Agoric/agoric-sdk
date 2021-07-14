/* global __dirname */
// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import bundleSource from '@agoric/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';

import {
  ChoiceMethod,
  makeBallotSpec,
  ElectionType,
  QuorumRule,
} from '../../src/ballotBuilder';

const registrarRoot = `${__dirname}/../../src/committeeRegistrar`;
const counterRoot = `${__dirname}/../../src/binaryBallotCounter`;

const setupContract = async () => {
  const zoe = makeZoe(fakeVatAdmin);

  // pack the contract
  const [registrarBundle, counterBundle] = await Promise.all([
    bundleSource(registrarRoot),
    bundleSource(counterRoot),
  ]);
  // install the contract
  const [registrarInstallation, counterInstallation] = await Promise.all([
    zoe.install(registrarBundle),
    zoe.install(counterBundle),
  ]);
  const terms = { committeeName: 'illuminati', committeeSize: 13 };
  const registrarStartResult = await E(zoe).startInstance(
    registrarInstallation,
    {},
    terms,
  );

  /** @type {ContractFacet} */
  return { registrarStartResult, counterInstallation };
};

test('committee-open questions:none', async t => {
  const {
    registrarStartResult: { publicFacet },
  } = await setupContract();
  t.deepEqual(await publicFacet.getOpenQuestions(), []);
});

test('committee-open question:one', async t => {
  const {
    registrarStartResult: { creatorFacet, publicFacet },
    counterInstallation,
  } = await setupContract();

  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    'why',
    ['because', 'why not?'],
    ElectionType.SURVEY,
    1,
  );
  const details = harden({
    ballotSpec,
    closingRule: {
      timer: buildManualTimer(console.log),
      deadline: 2n,
    },
    quorumRule: QuorumRule.HALF,
  });
  await E(creatorFacet).addQuestion(counterInstallation, details);
  const question = await publicFacet.getOpenQuestions();
  const ballot = E(publicFacet).getBallot(question[0]);
  const ballotDetails = await E(ballot).getDetails();
  t.deepEqual(ballotDetails.ballotSpec.question, 'why');
});

test('committee-open question:mixed', async t => {
  const {
    registrarStartResult: { creatorFacet, publicFacet },
    counterInstallation,
  } = await setupContract();

  const timer = buildManualTimer(console.log);
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    'why',
    ['because', 'why not?'],
    ElectionType.SURVEY,
    1,
  );
  const details = harden({
    ballotSpec,
    closingRule: {
      timer,
      deadline: 4n,
    },
    quorumRule: QuorumRule.HALF,
  });
  await E(creatorFacet).addQuestion(counterInstallation, details);

  const ballotSpec2 = {
    ...ballotSpec,
    question: 'why2',
  };
  const details2 = harden({
    ballotSpec: ballotSpec2,
    closingRule: details.closingRule,
    quorumRule: QuorumRule.HALF,
  });
  await E(creatorFacet).addQuestion(counterInstallation, details2);

  const ballotSpec3 = {
    ...ballotSpec,
    question: 'why3',
  };
  const details3 = harden({
    ballotSpec: ballotSpec3,
    closingRule: {
      timer,
      deadline: 1n,
    },
    quorumRule: QuorumRule.HALF,
  });
  const { publicFacet: counterPublic } = await E(creatorFacet).addQuestion(
    counterInstallation,
    details3,
  );
  // We didn't add any votes. getOutcome() will eventually return a broken
  // promise, but not until some time after tick(). Add a .catch() for it.
  E(counterPublic)
    .getOutcome()
    .catch(e => t.deepEqual(e, 'No quorum'));

  timer.tick();

  const questions = await publicFacet.getOpenQuestions();
  t.deepEqual(questions.length, 2);
});
