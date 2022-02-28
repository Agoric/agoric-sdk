// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import path from 'path';
import { E, Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSource from '@endo/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';

import { makePromiseKit } from '@endo/promise-kit';
import {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  looksLikeQuestionSpec,
} from '../../src/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const electorateRoot = `${dirname}/../../src/committee.js`;
const counterRoot = `${dirname}/../../src/binaryVoteCounter.js`;

const setupContract = async (
  terms = { committeeName: 'illuminati', committeeSize: 13 },
) => {
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // pack the contract
  const [electorateBundle, counterBundle] = await Promise.all([
    bundleSource(electorateRoot),
    bundleSource(counterRoot),
  ]);
  // install the contract
  const [electorateInstallation, counterInstallation] = await Promise.all([
    E(zoe).install(electorateBundle),
    E(zoe).install(counterBundle),
  ]);
  const electorateStartResult = await E(zoe).startInstance(
    electorateInstallation,
    {},
    terms,
  );

  /** @type {ContractFacet} */
  return { electorateStartResult, counterInstallation };
};

test('committee-open no questions', async t => {
  const {
    electorateStartResult: { publicFacet },
  } = await setupContract();
  t.deepEqual(await publicFacet.getOpenQuestions(), []);
});

test('committee-open question:one', async t => {
  const {
    electorateStartResult: { creatorFacet, publicFacet },
    counterInstallation,
  } = await setupContract();

  const positions = [harden({ text: 'because' }), harden({ text: 'why not?' })];
  const questionSpec = looksLikeQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: harden({ text: 'why' }),
    positions,
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    closingRule: {
      timer: buildManualTimer(console.log),
      deadline: 2n,
    },
    quorumRule: QuorumRule.MAJORITY,
    tieOutcome: positions[1],
  });
  await E(creatorFacet).addQuestion(counterInstallation, questionSpec);
  const questions = await publicFacet.getOpenQuestions();
  const question = E(publicFacet).getQuestion(questions[0]);
  const questionDetails = await E(question).getDetails();
  t.deepEqual(questionDetails.issue.text, 'why');
});

test('committee-open question:mixed', async t => {
  const {
    electorateStartResult: { creatorFacet, publicFacet },
    counterInstallation,
  } = await setupContract();

  const timer = buildManualTimer(console.log);
  const positions = [harden({ text: 'because' }), harden({ text: 'why not?' })];
  const questionSpec = looksLikeQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: harden({ text: 'why' }),
    positions,
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    closingRule: { timer, deadline: 4n },
    quorumRule: QuorumRule.MAJORITY,
    tieOutcome: positions[1],
  });
  await E(creatorFacet).addQuestion(counterInstallation, questionSpec);

  const questionSpec2 = {
    ...questionSpec,
    issue: harden({ text: 'why2' }),
    closingRule: questionSpec.closingRule,
    quorumRule: QuorumRule.MAJORITY,
  };
  await E(creatorFacet).addQuestion(counterInstallation, questionSpec2);

  const questionSpec3 = {
    ...questionSpec,
    issue: harden({ text: 'why3' }),
    closingRule: {
      timer,
      deadline: 1n,
    },
    quorumRule: QuorumRule.MAJORITY,
  };
  const { publicFacet: counterPublic } = await E(creatorFacet).addQuestion(
    counterInstallation,
    questionSpec3,
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

test('committee-distribute invitations', async t => {
  const DEPOSIT_FACET = 'depositFacet';

  const addresses = ['P43 Wallaby Way', '21 Jump Street'];
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();
  await Promise.all(addresses.map(key => E(namesByAddressAdmin).reserve(key)));

  const {
    electorateStartResult: { creatorFacet },
  } = await setupContract({
    committeeName: 'The Storybook Voters',
    committeeSize: addresses.length,
    addresses,
    namesByAddress,
  });

  const provisionClient = async address => {
    const { nameHub, nameAdmin } = makeNameHubKit();
    nameAdmin.reserve(DEPOSIT_FACET);
    namesByAddressAdmin.update(address, nameHub);
    return { address, nameHub, nameAdmin };
  };

  const clientBundles = await Promise.all(addresses.map(provisionClient));
  const clientsByAddress = Object.fromEntries(
    clientBundles.map(b => [b.address, b]),
  );

  const invitations = await E(creatorFacet)
    .getVoterInvitations()
    .then(ips => Promise.all(ips));

  t.plan(addresses.length);
  const deployWalletFor = async address => {
    const done = makePromiseKit();
    const contact = Far('contact', {
      receive: payment => {
        t.true(invitations.includes(payment), 'received expected invitation');
        done.resolve(payment);
      },
      done: () => done.promise,
    });
    const { nameAdmin } = clientsByAddress[address];
    await E(nameAdmin).update(DEPOSIT_FACET, contact);
    return contact;
  };
  const clients = await Promise.all(addresses.map(deployWalletFor));
  await Promise.all(clients.map(c => c.done()));
});
