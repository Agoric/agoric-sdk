import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { claim } from '@agoric/ertp/src/legacy-payment-helpers.js';

import { setup } from '../setupBasicMints.js';
import { setupNonFungible } from '../setupNonFungibleMints.js';
import { assertAmountsEqual } from '../../zoeTestHelpers.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const atomicSwapRoot = `${dirname}/../../../src/contracts/atomicSwap.js`;

test('zoe - atomicSwap', async t => {
  t.plan(8);
  const { moolaKit, simoleanKit, moola, simoleans, zoe, vatAdminState } =
    setup();

  const makeAlice = async moolaPayment => {
    const moolaPurse = await E(moolaKit.issuer).makeEmptyPurse();
    const simoleanPurse = await E(simoleanKit.issuer).makeEmptyPurse();
    return {
      installCode: async () => {
        // pack the contract
        const bundle = await bundleSource(atomicSwapRoot);
        // install the contract
        vatAdminState.installBundle('b1-atomicswap', bundle);
        const installationP = E(zoe).installBundleID('b1-atomicswap');
        return installationP;
      },
      startInstance: async installation => {
        const issuerKeywordRecord = harden({
          Asset: moolaKit.issuer,
          Price: simoleanKit.issuer,
        });
        const adminP = E(zoe).startInstance(installation, issuerKeywordRecord);
        return adminP;
      },
      offer: async firstInvitation => {
        const proposal = harden({
          give: { Asset: moola(3n) },
          want: { Price: simoleans(7n) },
          exit: { onDemand: null },
        });
        const payments = { Asset: moolaPayment };

        const seat = await E(zoe).offer(firstInvitation, proposal, payments);

        // The result of making the first offer is an invitation to swap by
        // providing the other goods.
        const invitationP = E(seat).getOfferResult();
        return { seat, invitationP };
      },
      collectPayouts: async seat => {
        await E(seat)
          .getPayout('Asset')
          .then(payment => moolaPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              moola(0n),
              `Alice didn't get any of what she put in`,
            ),
          );

        await E(seat)
          .getPayout('Price')
          .then(payment => simoleanPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              simoleans(7n),
              `Alice got exactly what she wanted`,
            ),
          );
      },
    };
  };

  const makeBob = (installation, simoleanPayment) => {
    const moolaPurse = moolaKit.issuer.makeEmptyPurse();
    const simoleanPurse = simoleanKit.issuer.makeEmptyPurse();
    return Far('bob', {
      offer: async untrustedInvitation => {
        const invitationIssuer = await E(zoe).getInvitationIssuer();

        // Bob is able to use the trusted invitationIssuer from Zoe to
        // transform an untrusted invitation that Alice also has access to, to
        // an
        const invitation = await claim(
          E(invitationIssuer).makeEmptyPurse(),
          untrustedInvitation,
        );
        const invitationValue = await E(zoe).getInvitationDetails(invitation);
        t.is(
          invitationValue.installation,
          installation,
          'installation is atomicSwap',
        );
        t.deepEqual(
          invitationValue.customDetails?.asset,
          moola(3n),
          `asset to be traded is 3 moola`,
        );
        t.deepEqual(
          invitationValue.customDetails?.price,
          simoleans(7n),
          `price is 7 simoleans, so bob must give that`,
        );

        const proposal = harden({
          give: { Price: simoleans(7n) },
          want: { Asset: moola(3n) },
          exit: { onDemand: null },
        });
        const payments = { Price: simoleanPayment };

        const seat = await E(zoe).offer(invitation, proposal, payments);

        t.is(
          await E(seat).getOfferResult(),
          'The offer has been accepted. Once the contract has been completed, please check your payout',
        );

        const r1 = E(seat)
          .getPayout('Asset')
          .then(payment => moolaPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              proposal.want.Asset,
              `Bob got what he wanted`,
            ),
          );

        const r2 = E(seat)
          .getPayout('Price')
          .then(payment => simoleanPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              simoleans(0n),
              `Bob didn't get anything back`,
            ),
          );
        await r1;
        await r2;
      },
    });
  };

  const alice = await makeAlice(await E(moolaKit.mint).mintPayment(moola(3n)));
  // Alice makes an instance and makes her offer.
  const installation = await alice.installCode();

  const bob = await makeBob(
    installation,
    await E(simoleanKit.mint).mintPayment(simoleans(7n)),
  );

  const { creatorInvitation } = await alice.startInstance(installation);
  const { seat, invitationP } = await alice.offer(creatorInvitation);

  // Alice spreads the invitation far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party, without needing to trust Alice at all.

  await bob.offer(invitationP);
  await alice.collectPayouts(seat);
});

test('zoe - non-fungible atomicSwap', async t => {
  t.plan(8);
  const {
    ccIssuer,
    rpgIssuer,
    ccMint,
    rpgMint,
    cryptoCats,
    rpgItems,
    createRpgItem,
    zoe,
    vatAdminState,
  } = setupNonFungible();

  const makeAlice = async aliceCcPayment => {
    const ccPurse = ccIssuer.makeEmptyPurse();
    const rpgPurse = rpgIssuer.makeEmptyPurse();
    return {
      installCode: async () => {
        // pack the contract
        const bundle = await bundleSource(atomicSwapRoot);
        // install the contract
        vatAdminState.installBundle('b1-atomicswap', bundle);
        const installationP = E(zoe).installBundleID('b1-atomicswap');
        return installationP;
      },
      startInstance: async installation => {
        const issuerKeywordRecord = harden({
          Asset: ccIssuer,
          Price: rpgIssuer,
        });
        const adminP = E(zoe).startInstance(installation, issuerKeywordRecord);
        return adminP;
      },
      offer: async (firstInvitation, calico37Amount, vorpalAmount) => {
        const proposal = harden({
          give: { Asset: calico37Amount },
          want: { Price: vorpalAmount },
          exit: { onDemand: null },
        });
        const payments = { Asset: aliceCcPayment };

        const seat = await E(zoe).offer(firstInvitation, proposal, payments);

        void seat
          .getPayout('Asset')
          .then(payment => ccPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              cryptoCats(harden([])),
              `Alice didn't get any of what she put in`,
            ),
          );

        void seat
          .getPayout('Price')
          .then(payment => rpgPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              proposal.want.Price,
              `Alice got exactly what she wanted`,
            ),
          );

        // The result of making the first offer is an invitation to swap by
        // providing the other goods.
        const invitationP = seat.getOfferResult();
        return invitationP;
      },
    };
  };

  const makeBob = (installation, rpgPayment) => {
    return Far('bob', {
      offer: async (untrustedInvitation, calico37Amount, vorpalAmount) => {
        const ccPurse = ccIssuer.makeEmptyPurse();
        const rpgPurse = rpgIssuer.makeEmptyPurse();

        const invitationIssuer = await E(zoe).getInvitationIssuer();

        // Bob is able to use the trusted invitationIssuer from Zoe to
        // transform an untrusted invitation that Alice also has access to, to
        // an
        const invitation = await claim(
          E(invitationIssuer).makeEmptyPurse(),
          untrustedInvitation,
        );
        const invitationValue = await E(zoe).getInvitationDetails(invitation);

        t.is(
          invitationValue.installation,
          installation,
          'installation is atomicSwap',
        );
        t.deepEqual(
          invitationValue.customDetails?.asset,
          calico37Amount,
          `asset to be traded is a particular crypto cat`,
        );
        t.deepEqual(
          invitationValue.customDetails?.price,
          vorpalAmount,
          `price is vorpalAmount, so bob must give that`,
        );

        const proposal = harden({
          give: { Price: vorpalAmount },
          want: { Asset: calico37Amount },
          exit: { onDemand: null },
        });
        const payments = { Price: rpgPayment };

        const seat = await E(zoe).offer(invitation, proposal, payments);

        t.is(
          await E(seat).getOfferResult(),
          'The offer has been accepted. Once the contract has been completed, please check your payout',
        );

        await seat
          .getPayout('Asset')
          .then(payment => ccPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              proposal.want.Asset,
              `Bob got what he wanted`,
            ),
          );

        await seat
          .getPayout('Price')
          .then(payment => rpgPurse.deposit(payment))
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              rpgItems(harden([])),
              `Bob didn't get anything back`,
            ),
          );
      },
    });
  };

  const calico37Amount = cryptoCats(harden(['calico #37']));
  const aliceCcPayment = await E(ccMint).mintPayment(calico37Amount);
  const alice = await makeAlice(aliceCcPayment);

  // Alice makes an instance and makes her offer.
  const installation = await alice.installCode();

  const vorpalSword = createRpgItem('Vorpal Sword', 'vorping');
  const vorpalAmount = rpgItems(vorpalSword);
  const bobRpgPayment = await E(rpgMint).mintPayment(vorpalAmount);
  const bob = await makeBob(installation, bobRpgPayment);
  const { creatorInvitation } = await alice.startInstance(installation);
  const invitation = await alice.offer(
    creatorInvitation,
    calico37Amount,
    vorpalAmount,
  );

  // Alice spreads the invitation far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party, without needing to trust Alice at all.

  await bob.offer(invitation, calico37Amount, vorpalAmount);
});

// Checking handling of duplicate issuers. I'd have preferred a raffle contract
test('zoe - atomicSwap like-for-like', async t => {
  t.plan(13);
  const { moolaIssuer, moolaMint, moola, zoe, vatAdminState } = setup();
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // pack the contract
  const bundle = await bundleSource(atomicSwapRoot);
  // install the contract
  vatAdminState.installBundle('b1-atomicswap', bundle);
  const installation = await E(zoe).installBundleID('b1-atomicswap');

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3n));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();

  // Setup Bob
  const bobMoolaPayment = moolaMint.mintPayment(moola(7n));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();

  // 1: Alice creates an atomicSwap instance
  const issuerKeywordRecord = harden({
    Asset: moolaIssuer,
    Price: moolaIssuer,
  });
  const { creatorInvitation: aliceInvitation } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );

  // 2: Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: moola(3n) },
    want: { Price: moola(7n) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceMoolaPayment };

  // 3: Alice makes the first offer in the swap.
  const aliceSeat = await E(zoe).offer(
    aliceInvitation,
    aliceProposal,
    alicePayments,
  );

  // 4: Alice spreads the invitation far and wide with instructions
  // on how to use it and Bob decides he wants to be the
  // counter-party.

  const bobInvitationP = E(aliceSeat).getOfferResult();
  const bobExclusiveInvitation = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    bobInvitationP,
  );
  const bobInvitationValue = await E(zoe).getInvitationDetails(
    bobExclusiveInvitation,
  );

  const bobIssuers = await E(zoe).getIssuers(bobInvitationValue.instance);

  t.is(bobInvitationValue.installation, installation, 'bobInstallationId');
  t.deepEqual(bobIssuers, { Asset: moolaIssuer, Price: moolaIssuer });
  t.deepEqual(bobInvitationValue.customDetails?.asset, moola(3n));
  t.deepEqual(bobInvitationValue.customDetails?.price, moola(7n));

  const bobProposal = harden({
    give: { Price: moola(7n) },
    want: { Asset: moola(3n) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobMoolaPayment };

  // 5: Bob makes an offer
  const bobSeat = await E(zoe).offer(
    bobExclusiveInvitation,
    bobProposal,
    bobPayments,
  );

  t.is(
    await E(bobSeat).getOfferResult(),
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );

  const bobAssetPayout = await bobSeat.getPayout('Asset');
  const bobPricePayout = await bobSeat.getPayout('Price');

  const aliceAssetPayout = await aliceSeat.getPayout('Asset');
  const alicePricePayout = await aliceSeat.getPayout('Price');

  // Alice gets what Alice wanted
  t.deepEqual(
    await moolaIssuer.getAmountOf(alicePricePayout),
    aliceProposal.want.Price,
  );

  // Alice didn't get any of what Alice put in
  await assertAmountsEqual(
    t,
    await moolaIssuer.getAmountOf(aliceAssetPayout),
    moola(0n),
  );

  // Alice deposits her payout to ensure she can
  const aliceAssetAmount = await aliceMoolaPurse.deposit(aliceAssetPayout);
  t.is(aliceAssetAmount.value, 0n);
  const alicePriceAmount = await aliceMoolaPurse.deposit(alicePricePayout);
  t.is(alicePriceAmount.value, 7n);

  // Bob deposits his original payments to ensure he can
  const bobAssetAmount = await bobMoolaPurse.deposit(bobAssetPayout);
  t.is(bobAssetAmount.value, 3n);
  const bobPriceAmount = await bobMoolaPurse.deposit(bobPricePayout);
  t.is(bobPriceAmount.value, 0n);

  // Assert that the correct payouts were received.
  // Alice had 3 moola from Asset and 0 from Price.
  // Bob had 0 moola from Asset and 7 from Price.
  t.is(aliceMoolaPurse.getCurrentAmount().value, 7n);
  t.is(bobMoolaPurse.getCurrentAmount().value, 3n);
});
