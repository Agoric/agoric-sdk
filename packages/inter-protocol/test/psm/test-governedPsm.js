// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { E } from '@endo/eventual-send';
import { setupPsm } from './setupPsm.js';

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

test('psm block offers w/Governance', async t => {
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });

  const { knut, zoe, psm, committeeCreator, governor, installs } =
    await setupPsm(t, electorateTerms, timer);

  const invitations = await E(committeeCreator).getVoterInvitations();
  const { governorCreatorFacet } = governor;

  const { details } = await E(governorCreatorFacet).voteOnOfferFilter(
    installs.counter,
    2n,
    harden(['wantMinted']),
  );
  const { positions, questionHandle } = await details;

  const exerciseAndVote = invitation => {
    const seat = E(zoe).offer(invitation);
    const { voter } = E.get(E(seat).getOfferResult());
    return E(voter).castBallotFor(questionHandle, [positions[0]]);
  };
  await Promise.all(invitations.map(exerciseAndVote));

  await timer.tick();
  await timer.tick();
  await timer.tick();

  t.deepEqual(['wantMinted'], await E(zoe).getOfferFilter(psm.instance));

  const giveCentral = knut.make(1_000_000n);

  await t.throwsAsync(
    () =>
      E(zoe).offer(
        E(psm.psmPublicFacet).makeWantMintedInvitation(),
        harden({ give: { In: giveCentral } }),
        harden({ In: knut.mint.mintPayment(giveCentral) }),
      ),
    { message: 'not accepting offer with description "wantMinted"' },
  );
});

test('psm block offers w/charter', async t => {
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });

  const { knut, zoe, psm, committeeCreator, psmCharterCreatorFacet } =
    await setupPsm(t, electorateTerms, timer);

  // onchain, the invitations get sent to the committee member via their
  // registered deposit facets. We'll skip that here.
  const invitations = await E(committeeCreator).getVoterInvitations();

  const cmInvitation = await E(
    psmCharterCreatorFacet,
  ).makeCharterMemberInvitation();

  const cmSeat = E(zoe).offer(cmInvitation);
  const result = await E(cmSeat).getOfferResult();

  const proposeInvitation = await E(result.invitationMakers).VoteOnPauseOffers(
    await psm.instance,
    ['wantMinted'],
    2n,
  );

  const requestVoteSeat = E(zoe).offer(proposeInvitation);
  const offerResult = await E(requestVoteSeat).getOfferResult();
  const { details } = offerResult;
  const { positions, questionHandle } = await details;

  const exerciseAndVote = invitation => {
    const seat = E(zoe).offer(invitation);
    const { voter } = E.get(E(seat).getOfferResult());

    return E(voter).castBallotFor(questionHandle, [positions[0]]);
  };
  await Promise.all(invitations.map(exerciseAndVote));

  await timer.tick();
  await timer.tick();
  await timer.tick();

  t.deepEqual(['wantMinted'], await E(zoe).getOfferFilter(psm.instance));

  const giveCentral = knut.make(1_000_000n);
  await t.throwsAsync(
    () =>
      E(zoe).offer(
        E(psm.psmPublicFacet).makeWantMintedInvitation(),
        harden({ give: { In: giveCentral } }),
        harden({ In: knut.mint.mintPayment(giveCentral) }),
      ),
    { message: 'not accepting offer with description "wantMinted"' },
  );
});

test('psm block offers w/charter via invitationMakers', async t => {
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });

  const { knut, zoe, psm, committeeCreator, psmCharterCreatorFacet } =
    await setupPsm(t, electorateTerms, timer);

  // onchain, the invitations get sent to the committee member via their
  // registered deposit facets. We'll skip that here.
  const invitations = await E(committeeCreator).getVoterInvitations();

  const cmInvitation = await E(
    psmCharterCreatorFacet,
  ).makeCharterMemberInvitation();

  const cmSeat = E(zoe).offer(cmInvitation);
  const result = await E(cmSeat).getOfferResult();

  const proposeInvitation = await E(result.invitationMakers).VoteOnPauseOffers(
    await psm.instance,
    ['wantMinted'],
    2n,
  );

  const requestVoteSeat = await E(zoe).offer(proposeInvitation);
  const offerResult = await E(requestVoteSeat).getOfferResult();
  const { details } = offerResult;
  const { positions, questionHandle } = await details;

  const exerciseAndVote = async invitation => {
    const seat = E(zoe).offer(invitation);
    const voteFacet = await E.get(E(seat).getOfferResult());
    E(voteFacet.voter).castBallotFor(questionHandle, [positions[0]]);
  };
  await Promise.all(invitations.map(exerciseAndVote));

  await timer.tick();
  await timer.tick();
  await timer.tick();

  t.deepEqual(['wantMinted'], await E(zoe).getOfferFilter(psm.instance));

  const giveCentral = knut.make(1_000_000n);
  await t.throwsAsync(
    () =>
      E(zoe).offer(
        E(psm.psmPublicFacet).makeWantMintedInvitation(),
        harden({ give: { In: giveCentral } }),
        harden({ In: knut.mint.mintPayment(giveCentral) }),
      ),
    { message: 'not accepting offer with description "wantMinted"' },
  );
});
