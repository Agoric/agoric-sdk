import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';

const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test('zoe - atomicSwap', async t => {
  t.plan(11);
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
  } = setup();
  const zoe = makeZoe();
  const inviteIssuer = zoe.getInviteIssuer();

  // pack the contract
  const bundle = await bundleSource(atomicSwapRoot);
  // install the contract
  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // 1: Alice creates an atomicSwap instance
  const issuerKeywordRecord = harden({
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });
  const { invite: aliceInvite } = await zoe.makeInstance(
    installationHandle,
    issuerKeywordRecord,
  );

  // 2: Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: simoleans(7) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceMoolaPayment };

  // 3: Alice makes the first offer in the swap.
  const { payout: alicePayoutP, outcome: bobInviteP } = await zoe.offer(
    aliceInvite,
    aliceProposal,
    alicePayments,
  );

  // 4: Alice spreads the invite far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party.

  const bobExclusiveInvite = await inviteIssuer.claim(bobInviteP);
  const {
    extent: [bobInviteExtent],
  } = await inviteIssuer.getAmountOf(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInviteExtent.instanceHandle);

  t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEquals(bobIssuers, { Asset: moolaIssuer, Price: simoleanIssuer });
  t.deepEquals(bobInviteExtent.asset, moola(3));
  t.deepEquals(bobInviteExtent.price, simoleans(7));

  const bobProposal = harden({
    give: { Price: simoleans(7) },
    want: { Asset: moola(3) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobSimoleanPayment };

  // 5: Bob makes an offer
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclusiveInvite,
    bobProposal,
    bobPayments,
  );

  t.equals(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobMoolaPayout = await bobPayout.Asset;
  const bobSimoleanPayout = await bobPayout.Price;

  const aliceMoolaPayout = await alicePayout.Asset;
  const aliceSimoleanPayout = await alicePayout.Price;

  // Alice gets what Alice wanted
  t.deepEquals(
    await simoleanIssuer.getAmountOf(aliceSimoleanPayout),
    aliceProposal.want.Price,
  );

  // Alice didn't get any of what Alice put in
  t.deepEquals(await moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0));

  // Alice deposits her payout to ensure she can
  await aliceMoolaPurse.deposit(aliceMoolaPayout);
  await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

  // Bob deposits his original payments to ensure he can
  await bobMoolaPurse.deposit(bobMoolaPayout);
  await bobSimoleanPurse.deposit(bobSimoleanPayout);

  // Assert that the correct payouts were received.
  // Alice had 3 moola and 0 simoleans.
  // Bob had 0 moola and 7 simoleans.
  t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
  t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);
  t.equals(bobMoolaPurse.getCurrentAmount().extent, 3);
  t.equals(bobSimoleanPurse.getCurrentAmount().extent, 0);
});

test('zoe - non-fungible atomicSwap', async t => {
  t.plan(11);
  const {
    ccIssuer,
    rpgIssuer,
    ccMint,
    rpgMint,
    cryptoCats,
    rpgItems,
    createRpgItem,
  } = setupNonFungible();

  const zoe = makeZoe();
  const inviteIssuer = zoe.getInviteIssuer();

  // pack the contract
  const bundle = await bundleSource(atomicSwapRoot);
  // install the contract
  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const calico37Amount = cryptoCats(harden(['calico #37']));
  const aliceCcPayment = ccMint.mintPayment(calico37Amount);
  const aliceCcPurse = ccIssuer.makeEmptyPurse();
  const aliceRpgPurse = rpgIssuer.makeEmptyPurse();

  // Setup Bob
  const vorpalSword = createRpgItem('Vorpal Sword', 38);
  const vorpalAmount = rpgItems(vorpalSword);
  const bobRpgPayment = rpgMint.mintPayment(vorpalAmount);
  const bobCcPurse = ccIssuer.makeEmptyPurse();
  const bobRpgPurse = rpgIssuer.makeEmptyPurse();

  // 1: Alice creates an atomicSwap instance
  const issuerKeywordRecord = harden({
    Asset: ccIssuer,
    Price: rpgIssuer,
  });
  const { invite: aliceInvite } = await zoe.makeInstance(
    installationHandle,
    issuerKeywordRecord,
  );

  // 2: Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: calico37Amount },
    want: { Price: vorpalAmount },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceCcPayment };

  // 3: Alice makes the first offer in the swap.
  const { payout: alicePayoutP, outcome: bobInviteP } = await zoe.offer(
    aliceInvite,
    aliceProposal,
    alicePayments,
  );

  // 4: Alice spreads the invite far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party.

  const bobExclusiveInvite = await inviteIssuer.claim(bobInviteP);
  const {
    extent: [bobInviteExtent],
  } = await inviteIssuer.getAmountOf(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInviteExtent.instanceHandle);

  t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEquals(bobIssuers, { Asset: ccIssuer, Price: rpgIssuer });
  t.deepEquals(bobInviteExtent.asset, calico37Amount);
  t.deepEquals(bobInviteExtent.price, vorpalAmount);

  const bobProposal = harden({
    give: { Price: vorpalAmount },
    want: { Asset: calico37Amount },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobRpgPayment };

  // 5: Bob makes an offer
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclusiveInvite,
    bobProposal,
    bobPayments,
  );

  t.equals(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobCcPayout = await bobPayout.Asset;
  const bobRpgPayout = await bobPayout.Price;

  const aliceCcPayout = await alicePayout.Asset;
  const aliceRpgPayout = await alicePayout.Price;

  // Alice gets what Alice wanted
  t.deepEquals(
    await rpgIssuer.getAmountOf(aliceRpgPayout),
    aliceProposal.want.Price,
  );

  // Alice didn't get any of what Alice put in
  t.deepEquals(
    await ccIssuer.getAmountOf(aliceCcPayout),
    cryptoCats(harden([])),
  );

  // Alice deposits her payout to ensure she can
  await aliceCcPurse.deposit(aliceCcPayout);
  await aliceRpgPurse.deposit(aliceRpgPayout);

  // Bob deposits his original payments to ensure he can
  await bobCcPurse.deposit(bobCcPayout);
  await bobRpgPurse.deposit(bobRpgPayout);

  // Assert that the correct payouts were received.
  // Alice had a CryptoCat and no RPG tokens.
  // Bob had an empty CryptoCat purse and a Vorpal Sword.
  t.deepEquals(aliceCcPurse.getCurrentAmount().extent, []);
  t.deepEquals(aliceRpgPurse.getCurrentAmount().extent, vorpalSword);
  t.deepEquals(bobCcPurse.getCurrentAmount().extent, ['calico #37']);
  t.deepEquals(bobRpgPurse.getCurrentAmount().extent, []);
});

// Checking handling of duplicate issuers. I'd have preferred a raffle contract
test('zoe - atomicSwap like-for-like', async t => {
  t.plan(13);
  const { moolaIssuer, moolaMint, moola } = setup();
  const zoe = makeZoe();
  const inviteIssuer = zoe.getInviteIssuer();

  // pack the contract
  const bundle = await bundleSource(atomicSwapRoot);
  // install the contract
  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();

  // Setup Bob
  const bobMoolaPayment = moolaMint.mintPayment(moola(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();

  // 1: Alice creates an atomicSwap instance
  const issuerKeywordRecord = harden({
    Asset: moolaIssuer,
    Price: moolaIssuer,
  });
  const { invite: aliceInvite } = await zoe.makeInstance(
    installationHandle,
    issuerKeywordRecord,
  );

  // 2: Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: moola(7) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceMoolaPayment };

  // 3: Alice makes the first offer in the swap.
  const { payout: alicePayoutP, outcome: bobInviteP } = await zoe.offer(
    aliceInvite,
    aliceProposal,
    alicePayments,
  );

  // 4: Alice spreads the invite far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party.

  const bobExclusiveInvite = await inviteIssuer.claim(bobInviteP);
  const {
    extent: [bobInviteExtent],
  } = await inviteIssuer.getAmountOf(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInviteExtent.instanceHandle);

  t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEquals(bobIssuers, { Asset: moolaIssuer, Price: moolaIssuer });
  t.deepEquals(bobInviteExtent.asset, moola(3));
  t.deepEquals(bobInviteExtent.price, moola(7));

  const bobProposal = harden({
    give: { Price: moola(7) },
    want: { Asset: moola(3) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobMoolaPayment };

  // 5: Bob makes an offer
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclusiveInvite,
    bobProposal,
    bobPayments,
  );

  t.equals(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobAssetPayout = await bobPayout.Asset;
  const bobPricePayout = await bobPayout.Price;

  const aliceAssetPayout = await alicePayout.Asset;
  const alicePricePayout = await alicePayout.Price;

  // Alice gets what Alice wanted
  t.deepEquals(
    await moolaIssuer.getAmountOf(alicePricePayout),
    aliceProposal.want.Price,
  );

  // Alice didn't get any of what Alice put in
  t.deepEquals(await moolaIssuer.getAmountOf(aliceAssetPayout), moola(0));

  // Alice deposits her payout to ensure she can
  const aliceAssetAmount = await aliceMoolaPurse.deposit(aliceAssetPayout);
  t.equals(aliceAssetAmount.extent, 0);
  const alicePriceAmount = await aliceMoolaPurse.deposit(alicePricePayout);
  t.equals(alicePriceAmount.extent, 7);

  // Bob deposits his original payments to ensure he can
  const bobAssetAmount = await bobMoolaPurse.deposit(bobAssetPayout);
  t.equals(bobAssetAmount.extent, 3);
  const bobPriceAmount = await bobMoolaPurse.deposit(bobPricePayout);
  t.equals(bobPriceAmount.extent, 0);

  // Assert that the correct payouts were received.
  // Alice had 3 moola from Asset and 0 from Price.
  // Bob had 0 moola from Asset and 7 from Price.
  t.equals(aliceMoolaPurse.getCurrentAmount().extent, 7);
  t.equals(bobMoolaPurse.getCurrentAmount().extent, 3);
});
