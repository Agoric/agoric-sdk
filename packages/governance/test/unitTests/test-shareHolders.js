// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@endo/bundle-source';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import { E } from '@agoric/eventual-send';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';

import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { Nat } from '@agoric/nat';
import { makeZoeKit } from '@agoric/zoe';
import {
  ElectionType,
  ChoiceMethod,
  QuorumRule,
  looksLikeQuestionSpec,
} from '../../src/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const shareHoldersRoot = `${dirname}/../../src/shareHolders.js`;
const binaryCounterRoot = `${dirname}/../../src/binaryVoteCounter.js`;

/**
 * @param {string} sourceRoot
 * @param {ERef<ZoeService>} zoe
 */
const makeInstall = (sourceRoot, zoe) => {
  const bundle = bundleSource(sourceRoot);
  console.log(`installing ${sourceRoot}`);
  return E.when(bundle, b => E(zoe).install(b));
};

const makeAttestation = (handle, amountLiened, address, expiration) =>
  harden([{ handle, amountLiened, address, expiration }]);

/**
 * @param {Address} addr
 * @param {NatValue} amountLiened
 * @param {Timestamp} expiration
 */
const attest = (addr, amountLiened, expiration) => {
  Nat(amountLiened);
  Nat(expiration);
  const handle = makeHandle('Attestation');
  return makeAttestation(handle, amountLiened, addr, expiration);
};

/**
 * @param {Issue} issue
 * @param {Position[]} positions
 * @param {ERef<Timer>} timer
 * @param {Timestamp} deadline
 */
const makeDefaultBallotSpec = (issue, positions, timer, deadline) => {
  const questionSpec = looksLikeQuestionSpec(
    harden({
      method: ChoiceMethod.UNRANKED,
      issue,
      positions,
      electionType: ElectionType.ELECTION,
      maxChoices: 1,
      closingRule: {
        timer,
        deadline,
      },
      quorumRule: QuorumRule.NO_QUORUM,
      tieOutcome: positions[1],
    }),
  );

  return questionSpec;
};

const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

const electorateInstall = makeInstall(shareHoldersRoot, zoe);
const counterInstall = makeInstall(binaryCounterRoot, zoe);

/**
 * @param {Mint} attestationMint
 * @param {ClaimsElectoratePublic} publicElectorate
 * @param {Amount} attestation
 */
const offerToVoteSeat = (attestationMint, publicElectorate, attestation) => {
  const attestation1 = attestationMint.mintPayment(attestation);
  const proposal = harden({
    give: { Attestation: attestation },
    want: {},
  });
  return E(zoe).offer(
    E(publicElectorate).makeVoterInvitation(),
    proposal,
    harden({
      Attestation: attestation1,
    }),
  );
};

/**
 * @param {Mint} mint
 * @param {ClaimsElectoratePublic} publicFacet
 * @param {Amount} attestAmmount
 */
const voterFacet = (mint, publicFacet, attestAmmount) => {
  return E(offerToVoteSeat(mint, publicFacet, attestAmmount)).getOfferResult();
};

/**
 * @param {Timer} timer
 * @param {ShareholdersCreatorFacet} creatorFacet
 */
const addDeposeQuestion = async (timer, creatorFacet) => {
  const depose = harden({ text: 'Replace the CEO?' });
  const deposePositions = harden([
    harden({ text: 'Yes, replace' }),
    harden({ text: 'no change' }),
  ]);
  const deposeSpec = makeDefaultBallotSpec(depose, deposePositions, timer, 2n);
  const { publicFacet: deposeCounter, questionHandle } = await E(
    creatorFacet,
  ).addQuestion(counterInstall, deposeSpec);
  return { deposePositions, deposeCounter, questionHandle };
};

const addDividendQuestion = async (timer, creatorFacet) => {
  const dividend = harden({ text: 'Raise the dividend?' });
  const divPositions = [
    harden({ text: 'Raise dividend to $0.70' }),
    harden({ text: 'Raise dividend to $0.50' }),
  ];
  const dividendSpec = makeDefaultBallotSpec(dividend, divPositions, timer, 4n);
  const { publicFacet: dividendCounter, questionHandle } = await E(
    creatorFacet,
  ).addQuestion(counterInstall, dividendSpec);
  return { divPositions, dividendCounter, questionHandle };
};

test('shareHolders attestation returned on simpleInvite', async t => {
  const { issuer, brand, mint } = makeIssuerKit('attestations', AssetKind.SET);

  const { publicFacet: electoratePub } = await E(zoe).startInstance(
    electorateInstall,
    harden({
      Attestation: issuer,
    }),
  );

  const attest1 = AmountMath.make(brand, attest('a', 37n, 5n));
  const voteSeat = offerToVoteSeat(mint, electoratePub, attest1);
  const aPurse = issuer.makeEmptyPurse();
  await aPurse.deposit(await E(voteSeat).getPayout('Attestation'));

  t.deepEqual(await E(aPurse).getCurrentAmount(), attest1);
});

test('shareHolders attestation to vote', async t => {
  const { issuer, brand, mint } = makeIssuerKit('attestations', AssetKind.SET);
  const timer = buildManualTimer(console.log);
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    electorateInstall,
    harden({ Attestation: issuer }),
  );

  const attest1 = AmountMath.make(brand, attest('a', 37n, 5n));
  const voteSeat = voterFacet(mint, publicFacet, attest1);

  const {
    deposePositions,
    deposeCounter,
    questionHandle,
  } = await addDeposeQuestion(timer, creatorFacet);

  await E(voteSeat).castBallotFor(questionHandle, [deposePositions[1]]);

  await E(timer).tick();
  await E(timer).tick();

  await E.when(E(deposeCounter).getOutcome(), outcome => {
    t.is(outcome, deposePositions[1]);
  }).catch(e => t.fail(e));
});

test('shareHolders reuse across questions', async t => {
  const { issuer, brand, mint } = makeIssuerKit('attestations', AssetKind.SET);
  const timer = buildManualTimer(console.log);
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    electorateInstall,
    harden({ Attestation: issuer }),
  );

  const attest1 = AmountMath.make(brand, attest('a', 37n, 5n));
  const voteFacet1 = voterFacet(mint, publicFacet, attest1);
  const attest2 = AmountMath.make(brand, attest('a', 13n, 6n));
  const voteFacet2 = voterFacet(mint, publicFacet, attest2);
  const {
    deposePositions,
    deposeCounter,
    questionHandle: h1,
  } = await addDeposeQuestion(timer, creatorFacet);

  const {
    divPositions,
    dividendCounter,
    questionHandle: h2,
  } = await addDividendQuestion(timer, creatorFacet);

  const deposeBallot1 = [deposePositions[1]];
  const divBallot0 = [divPositions[0]];

  const vote1dep1 = E(voteFacet1).castBallotFor(h1, deposeBallot1);
  const vote2dep1 = E(voteFacet2).castBallotFor(h1, deposeBallot1);
  const vote1div0 = E(voteFacet1).castBallotFor(h2, divBallot0);
  const vote2div0 = E(voteFacet2).castBallotFor(h2, divBallot0);
  const t1 = E(timer).tick();

  await Promise.all([vote1dep1, vote2dep1, vote1div0, vote2div0, t1]);
  await Promise.all([E(timer).tick(), E(timer).tick(), E(timer).tick()]);

  const deposeOutcome = await E(deposeCounter).getOutcome();
  t.is(deposeOutcome, deposePositions[1]);

  await E(timer).tick();
  const dividendOutcome = await E(dividendCounter).getOutcome();
  t.is(dividendOutcome, divPositions[0]);

  const dividendTally = await E(dividendCounter).getStats();
  t.deepEqual(dividendTally, {
    spoiled: 0n,
    votes: 2,
    results: [
      { position: divPositions[0], total: 50n },
      { position: divPositions[1], total: 0n },
    ],
  });
  const deposeTally = await E(deposeCounter).getStats();
  t.deepEqual(deposeTally, {
    spoiled: 0n,
    votes: 2,
    results: [
      { position: deposePositions[0], total: 0n },
      { position: deposePositions[1], total: 50n },
    ],
  });
});

test('shareHolders expiring attestations', async t => {
  const { issuer, brand, mint } = makeIssuerKit('attestations', AssetKind.SET);
  const timer = buildManualTimer(console.log);
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    electorateInstall,
    harden({ Attestation: issuer }),
  );

  // deadlines:  depose: 2, dividends: 4
  // voter 1 votes won't count; voter 2 can't vote on dividends.
  const attest1 = AmountMath.make(brand, attest('a', 37n, 1n));
  const voteFacet1 = await voterFacet(mint, publicFacet, attest1);
  const attest2 = AmountMath.make(brand, attest('a', 13n, 3n));
  const voteFacet2 = await voterFacet(mint, publicFacet, attest2);
  const attest3 = AmountMath.make(brand, attest('a', 7n, 5n));
  const voteFacet3 = await voterFacet(mint, publicFacet, attest3);

  const {
    deposePositions,
    deposeCounter,
    questionHandle: deposeQuestionHandle,
  } = await addDeposeQuestion(timer, creatorFacet);

  const {
    divPositions,
    dividendCounter,
    questionHandle: dividendQuestionHandle,
  } = await addDividendQuestion(timer, creatorFacet);

  const deposeBallot0 = [deposePositions[0]];
  const deposeBallot1 = [deposePositions[1]];
  const divBallot0 = [divPositions[0]];
  const divBallot1 = [divPositions[1]];

  const vote1dep1 = E(voteFacet1).castBallotFor(
    deposeQuestionHandle,
    deposeBallot1,
  );
  const vote1div0 = E(voteFacet1).castBallotFor(
    dividendQuestionHandle,
    divBallot0,
  );
  const vote2dep1 = E(voteFacet2).castBallotFor(
    deposeQuestionHandle,
    deposeBallot1,
  );
  const vote2div0 = E(voteFacet2).castBallotFor(
    dividendQuestionHandle,
    divBallot0,
  );
  const vote3div1 = E(voteFacet3).castBallotFor(
    dividendQuestionHandle,
    divBallot1,
  );
  const vote3dep0 = E(voteFacet3).castBallotFor(
    deposeQuestionHandle,
    deposeBallot0,
  );

  await Promise.all([vote1dep1, vote2dep1, vote1div0, vote2div0]);
  await Promise.all([vote3dep0, vote3div1]);
  await Promise.all([E(timer).tick(), E(timer).tick()]);
  await Promise.all([E(timer).tick(), E(timer).tick()]);

  const deposeOutcome = await E(deposeCounter).getOutcome();
  t.is(deposeOutcome, deposePositions[1]);
  const deposeTally = await E(deposeCounter).getStats();
  t.deepEqual(deposeTally, {
    spoiled: 0n,
    votes: 2,
    results: [
      { position: deposePositions[0], total: 7n },
      { position: deposePositions[1], total: 13n },
    ],
  });

  const dividendOutcome = await E(dividendCounter).getOutcome();
  t.is(dividendOutcome, divPositions[1]);
  const dividendTally = await E(dividendCounter).getStats();
  t.deepEqual(dividendTally, {
    spoiled: 0n,
    votes: 1,
    results: [
      { position: divPositions[0], total: 0n },
      { position: divPositions[1], total: 7n },
    ],
  });
});

test('shareHolders bundle/split attestations', async t => {
  const { issuer, brand, mint } = makeIssuerKit('attestations', AssetKind.SET);
  const timer = buildManualTimer(console.log);
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    electorateInstall,
    harden({ Attestation: issuer }),
  );

  // deadline:  depose: 2
  const handleShared = makeHandle('Attestation');
  const handle4 = makeHandle('Attestation');
  const handle7 = makeHandle('Attestation');
  const claim2 = makeAttestation(handleShared, 2n, 'a', 3n)[0];
  const claim4 = makeAttestation(handle4, 4n, 'a', 7n)[0];
  const claim7 = makeAttestation(handle7, 7n, 'a', 3n)[0];
  const claim7Later = makeAttestation(handle7, 7n, 'a', 10n)[0];
  const claim14 = makeAttestation(handleShared, 14n, 'a', 7n)[0];

  const attest2and4 = AmountMath.make(brand, harden([claim2, claim4]));
  const voteFacet2and4 = await voterFacet(mint, publicFacet, attest2and4);
  const attest4and7 = AmountMath.make(brand, harden([claim4, claim7]));
  const voteFacet4and7 = await voterFacet(mint, publicFacet, attest4and7);
  const attestUpdate = AmountMath.make(brand, harden([claim7Later, claim14]));
  const voteFacetUpdate = await voterFacet(mint, publicFacet, attestUpdate);

  const {
    deposePositions,
    deposeCounter,
    questionHandle,
  } = await addDeposeQuestion(timer, creatorFacet);

  const deposeBallot0 = [deposePositions[0]];
  const deposeBallot1 = [deposePositions[1]];

  await E(voteFacet2and4).castBallotFor(questionHandle, deposeBallot1);
  await E(voteFacet4and7).castBallotFor(questionHandle, deposeBallot0);
  await E(voteFacetUpdate).castBallotFor(questionHandle, deposeBallot1);
  // 2n voted [1], then added capital and voted 14n [1]
  // 4n voted [1] then [0]
  // 7n voted [0] then [1]

  await Promise.all([E(timer).tick(), E(timer).tick()]);

  const deposeOutcome = await E(deposeCounter).getOutcome();
  t.is(deposeOutcome, deposePositions[1]);
  const deposeTally = await E(deposeCounter).getStats();
  t.deepEqual(deposeTally, {
    spoiled: 0n,
    votes: 3,
    results: [
      { position: deposePositions[0], total: 4n },
      { position: deposePositions[1], total: 21n },
    ],
  });
});
