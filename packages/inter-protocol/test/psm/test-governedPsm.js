// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
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

  const { knutIssuer, zoe, psm, committeeCreator, governor, installs } =
    await setupPsm(t, electorateTerms, timer);

  const invitations = await E(committeeCreator).getVoterInvitations();
  const { governorCreatorFacet } = governor;

  // @ts-expect-error undeclared type?
  const { details } = await E(governorCreatorFacet).voteOnOfferFilter(
    installs.counter,
    2n,
    harden(['wantStable']),
  );
  const { positions, questionHandle } = await details;

  const exerciseAndVote = invitation => {
    const seat = E(zoe).offer(invitation);
    const voteFacet = E(seat).getOfferResult();
    return E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
  };
  await Promise.all(invitations.map(exerciseAndVote));

  await timer.tick();
  await timer.tick();
  await timer.tick();

  t.deepEqual(['wantStable'], await E(zoe).getOfferFilter(psm.instance));

  const giveCentral = AmountMath.make(knutIssuer.brand, 1_000_000n);

  await t.throwsAsync(
    () =>
      E(zoe).offer(
        E(psm.psmPublicFacet).makeWantStableInvitation(),
        harden({ give: { In: giveCentral } }),
        harden({ In: knutIssuer.mint.mintPayment(giveCentral) }),
      ),
    { message: 'not accepting offer with description "wantStable"' },
  );
});
