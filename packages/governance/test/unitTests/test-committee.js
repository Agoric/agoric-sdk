// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import path from 'path';
import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSource from '@agoric/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import { ChoiceMethod } from '../../src/ballotBuilder.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const registrarRoot = `${dirname}/../../src/committeeRegistrar.js`;
const counterRoot = `${dirname}/../../src/binaryBallotCounter.js`;

async function setupContract() {
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

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
}

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

  const details = harden({
    method: ChoiceMethod.CHOOSE_N,
    question: 'why',
    positions: ['because', 'why not?'],
    maxChoices: 1,
    closingRule: {
      timer: buildManualTimer(console.log),
      deadline: 2n,
    },
  });
  await E(creatorFacet).addQuestion(counterInstallation, details);
  t.deepEqual(await publicFacet.getOpenQuestions(), ['why']);
});

test('committee-open question:mixed', async t => {
  const {
    registrarStartResult: { creatorFacet, publicFacet },
    counterInstallation,
  } = await setupContract();

  const timer = buildManualTimer(console.log);
  const details = harden({
    method: ChoiceMethod.CHOOSE_N,
    question: 'why',
    positions: ['because', 'why not?'],
    maxChoices: 1,
    closingRule: {
      timer,
      deadline: 4n,
    },
  });
  await E(creatorFacet).addQuestion(counterInstallation, details);

  const details2 = harden({
    ...details,
    question: 'why2',
  });
  await E(creatorFacet).addQuestion(counterInstallation, details2);

  const details3 = harden({
    ...details,
    question: 'why3',
    closingRule: {
      timer,
      deadline: 1n,
    },
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

  t.deepEqual(await publicFacet.getOpenQuestions(), ['why', 'why2']);
});
