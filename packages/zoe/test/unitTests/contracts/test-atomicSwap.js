// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';

const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test.only('zoe - atomicSwap - alice completes her offer early', async t => {
  t.plan(5);
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
  } = setup();
  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();

  // pack the contract
  const { source, moduleFormat } = await bundleSource(atomicSwapRoot);
  // install the contract
  const installationHandle = zoe.install(source, moduleFormat);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Alice creates an atomicSwap instance
  const issuerKeywordRecord = harden({
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });
  const aliceInvite = await zoe.makeInstance(
    installationHandle,
    issuerKeywordRecord,
  );

  // Alice makes the first offer in the swap.
  const aliceProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: simoleans(7) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceMoolaPayment };

  console.log('alice makes offer');
  const {
    payout: alicePayoutP,
    outcome: bobInviteP,
    completeObj,
  } = await zoe.offer(aliceInvite, aliceProposal, alicePayments);

  // Alice completes her offer
  await completeObj.complete();

  // Alice gives Bob an invite
  const bobExclusiveInvite = await inviteIssuer.claim(bobInviteP);

  const bobProposal = harden({
    give: { Price: simoleans(7) },
    want: { Asset: moola(3) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobSimoleanPayment };

  // Bob makes an offer
  console.log('bob makes offer');
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclusiveInvite,
    bobProposal,
    bobPayments,
  );

  t.rejects(
    () => bobOutcomeP,
    /prior offer is unavailable/,
    `bob's offer is rejected`,
  );
  // Bob and Alice get refunds
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobMoolaPayout = await bobPayout.Asset;
  const bobSimoleanPayout = await bobPayout.Price;

  const aliceMoolaPayout = await alicePayout.Asset;
  const aliceSimoleanPayout = await alicePayout.Price;

  // Alice deposits her payout to ensure she can
  await aliceMoolaPurse.deposit(aliceMoolaPayout);
  await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

  // Bob deposits his original payments to ensure he can
  await bobMoolaPurse.deposit(bobMoolaPayout);
  await bobSimoleanPurse.deposit(bobSimoleanPayout);

  // Assert that the correct payouts were received.
  // Alice had 3 moola and 0 simoleans.
  // Bob had 0 moola and 7 simoleans.
  t.equals(aliceMoolaPurse.getCurrentAmount().extent, 3);
  t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 0);
  t.equals(bobMoolaPurse.getCurrentAmount().extent, 0);
  t.equals(bobSimoleanPurse.getCurrentAmount().extent, 7);
});
