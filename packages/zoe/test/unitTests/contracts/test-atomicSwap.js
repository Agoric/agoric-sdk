import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';

const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test.only('zoe - atomicSwap', async t => {
  t.plan(8);
  const { moolaKit, simoleanKit, moola, simoleans, zoe } = setup();

  const makeAlice = async moolaPayment => {
    const moolaPurse = await E(moolaKit.issuer).makeEmptyPurse();
    const simoleanPurse = await E(simoleanKit.issuer).makeEmptyPurse();
    return {
      installCode: async () => {
        // pack the contract
        const bundle = await bundleSource(atomicSwapRoot);
        // install the contract
        const installationP = E(zoe).install(bundle);
        return installationP;
      },
      makeInstance: async installation => {
        const issuerKeywordRecord = harden({
          Asset: moolaKit.issuer,
          Price: simoleanKit.issuer,
        });
        const adminP = zoe.makeInstance(installation, issuerKeywordRecord);
        return adminP;
      },
      offer: async firstInvitation => {

        const proposal = harden({
          give: { Asset: moola(3) },
          want: { Price: simoleans(7) },
          exit: { onDemand: null },
        });
        const payments = { Asset: moolaPayment };

        const seat = await zoe.offer(firstInvitation, proposal, payments);

        seat
          .getPayout('Asset')
          .then(moolaPurse.deposit)
          .then(amountDeposited =>
            t.deepEquals(
              amountDeposited,
              moola(0),
              `Alice didn't get any of what she put in`,
            ),
          );

        seat
          .getPayout('Price')
          .then(simoleanPurse.deposit)
          .then(amountDeposited =>
            t.deepEquals(
              amountDeposited,
              proposal.want.Price,
              `Alice got exactly what she wanted`,
            ),
          );

        // The result of making the first offer is an invite to swap by
        // providing the other goods.
        const invitationP = seat.getOfferResult();
        return invitationP;
      },
    };
  };

  const makeBob = (installation, simoleanPayment) => {
    return harden({
      offer: async untrustedInvitation => {
        const moolaPurse = moolaKit.issuer.makeEmptyPurse();
        const simoleanPurse = simoleanKit.issuer.makeEmptyPurse();

        const invitationIssuer = await E(zoe).getInvitationIssuer();

        // Bob is able to use the trusted invitationIssuer from Zoe to
        // transform an untrusted invitation that Alice also has access to, to
        // an
        const invitation = await invitationIssuer.claim(untrustedInvitation);

        const {
          value: [invitationValue],
        } = await invitationIssuer.getAmountOf(invitation);

        t.equals(
          invitationValue.installation,
          installation,
          'installation is atomicSwap',
        );
        t.deepEquals(
          invitationValue.asset,
          moola(3),
          `asset to be traded is 3 moola`,
        );
        t.deepEquals(
          invitationValue.price,
          simoleans(7),
          `price is 7 simoleans, so bob must give that`,
        );

        const proposal = harden({
          give: { Price: simoleans(7) },
          want: { Asset: moola(3) },
          exit: { onDemand: null },
        });
        const payments = { Price: simoleanPayment };

        const seat = await zoe.offer(invitation, proposal, payments);

        t.equals(
          await E(seat).getOfferResult(),
          'The offer has been accepted. Once the contract has been completed, please check your payout',
        );

        seat
          .getPayout('Asset')
          .then(moolaPurse.deposit)
          .then(amountDeposited =>
            t.deepEquals(
              amountDeposited,
              proposal.want.Asset,
              `Bob got what he wanted`,
            ),
          );

        seat
          .getPayout('Price')
          .then(simoleanPurse.deposit)
          .then(amountDeposited =>
            t.deepEquals(
              amountDeposited,
              simoleans(0),
              `Bob didn't get anything back`,
            ),
          );
      },
    });
  };

  const alice = await makeAlice(await E(moolaKit.mint).mintPayment(moola(3)));

  // Alice makes an instance and makes her offer.
  const installation = await alice.installCode();

  const bob = await makeBob(
    installation,
    await E(simoleanKit.mint).mintPayment(simoleans(7)),
  );
  const { adminInvitation } = await alice.makeInstance(installation);
  const invitation = await alice.offer(adminInvitation);

  // Alice spreads the invitation far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party, without needing to trust Alice at all.

  await bob.offer(invitation);
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

  const zoe = makeZoe(fakeVatAdmin);
  const invitationIssuer = zoe.getInvitationIssuer();

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

  const bobExclusiveInvite = await invitationIssuer.claim(bobInviteP);
  const {
    value: [bobInviteValue],
  } = await invitationIssuer.getAmountOf(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInviteValue.instanceHandle);

  t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEquals(bobIssuers, { Asset: ccIssuer, Price: rpgIssuer });
  t.deepEquals(bobInviteValue.asset, calico37Amount);
  t.deepEquals(bobInviteValue.price, vorpalAmount);

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
  t.deepEquals(aliceCcPurse.getCurrentAmount().value, []);
  t.deepEquals(aliceRpgPurse.getCurrentAmount().value, vorpalSword);
  t.deepEquals(bobCcPurse.getCurrentAmount().value, ['calico #37']);
  t.deepEquals(bobRpgPurse.getCurrentAmount().value, []);
});

// Checking handling of duplicate issuers. I'd have preferred a raffle contract
test('zoe - atomicSwap like-for-like', async t => {
  t.plan(13);
  const { moolaIssuer, moolaMint, moola } = setup();
  const zoe = makeZoe(fakeVatAdmin);
  const invitationIssuer = zoe.getInvitationIssuer();

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

  const bobExclusiveInvite = await invitationIssuer.claim(bobInviteP);
  const {
    value: [bobInviteValue],
  } = await invitationIssuer.getAmountOf(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInviteValue.instanceHandle);

  t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEquals(bobIssuers, { Asset: moolaIssuer, Price: moolaIssuer });
  t.deepEquals(bobInviteValue.asset, moola(3));
  t.deepEquals(bobInviteValue.price, moola(7));

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
  t.equals(aliceAssetAmount.value, 0);
  const alicePriceAmount = await aliceMoolaPurse.deposit(alicePricePayout);
  t.equals(alicePriceAmount.value, 7);

  // Bob deposits his original payments to ensure he can
  const bobAssetAmount = await bobMoolaPurse.deposit(bobAssetPayout);
  t.equals(bobAssetAmount.value, 3);
  const bobPriceAmount = await bobMoolaPurse.deposit(bobPricePayout);
  t.equals(bobPriceAmount.value, 0);

  // Assert that the correct payouts were received.
  // Alice had 3 moola from Asset and 0 from Price.
  // Bob had 0 moola from Asset and 7 from Price.
  t.equals(aliceMoolaPurse.getCurrentAmount().value, 7);
  t.equals(bobMoolaPurse.getCurrentAmount().value, 3);
});
