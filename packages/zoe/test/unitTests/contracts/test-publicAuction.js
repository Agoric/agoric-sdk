import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const publicAuctionRoot = `${__dirname}/../../../contracts/publicAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe({ require });
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(11));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Setup Carol
    const carolMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const carolSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const carolSimoleanPayment = carolSimoleanPurse.withdrawAll();

    // Setup Dave
    const daveMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const daveSimoleanPurse = mints[1].mint(assays[1].makeUnits(5));
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const {
      instance: aliceAuction,
      instanceHandle,
    } = await zoe.makeInstance(installationHandle, { assays, numBidsAllowed });

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(3),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payout: alicePayoutP,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice initializes the auction with her escrow receipt
    const aliceOfferResult = await aliceAuction.startAuction(
      aliceEscrowReceipt,
    );

    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // 5: Alice spreads the instanceHandle far and wide with
    // instructions on how to use it and Bob decides he wants to
    // participate in the auction.
    const {
      instance: bobAuction,
      installationHandle: bobInstallationId,
      terms,
    } = zoe.getInstance(instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(terms.assays, assays);

    const minBid = bobAuction.getMinimumBid();
    const auctionedAssets = bobAuction.getAuctionedAssets();

    t.deepEquals(minBid, assays[1].makeUnits(3));
    t.deepEquals(auctionedAssets, assays[0].makeUnits(1));

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(11),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payout: bobPayoutP,
    } = await zoe.escrow(bobOfferRules, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOfferResult = await bobAuction.bid(bobEscrowReceipt);

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // 9: Carol decides to bid for the one moola

    const {
      instance: carolAuction,
      installationHandle: carolInstallationId,
      terms: carolTerms,
    } = zoe.getInstance(instanceHandle);

    t.equals(carolInstallationId, installationHandle);
    t.deepEquals(carolTerms.assays, assays);

    const carolOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const carolPayments = [undefined, carolSimoleanPayment];

    // 10: Carol escrows with zoe
    const {
      escrowReceipt: carolEscrowReceipt,
      payout: carolPayoutP,
    } = await zoe.escrow(carolOfferRules, carolPayments);

    // 11: Carol makes an offer with her escrow receipt
    const carolOfferResult = await carolAuction.bid(carolEscrowReceipt);

    t.equals(
      carolOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // 12: Dave decides to bid for the one moola
    const {
      instance: daveAuction,
      installationHandle: daveInstallationId,
      terms: daveTerms,
    } = zoe.getInstance(instanceHandle);

    t.equals(daveInstallationId, installationHandle);
    t.deepEquals(daveTerms.assays, assays);
    const daveOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(5),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const davePayments = [undefined, daveSimoleanPayment];

    // 13: Dave escrows with zoe
    const {
      escrowReceipt: daveEscrowReceipt,
      payout: davePayoutP,
    } = await zoe.escrow(daveOfferRules, davePayments);

    // 14: Dave makes an offer with his escrow receipt
    const daveOfferResult = await daveAuction.bid(daveEscrowReceipt);

    t.equals(
      daveOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;
    const carolResult = await carolPayoutP;
    const daveResult = await davePayoutP;

    // Alice (the creator of the auction) gets back the second highest bid
    t.deepEquals(
      aliceResult[1].getBalance(),
      carolOfferRules.payoutRules[1].units,
    );

    // Alice didn't get any of what she put in
    t.equals(aliceResult[0].getBalance().extent, 0);

    // 23: Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob (the winner of the auction) gets the one moola and the
    // difference between his bid and the price back
    t.deepEquals(bobResult[0].getBalance(), unitOps[0].make(1));
    t.deepEquals(bobResult[1].getBalance(), unitOps[1].make(4));

    // 24: Bob deposits his payout to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Carol gets a full refund
    t.deepEquals(carolResult[0].getBalance(), unitOps[0].make(0));
    t.deepEquals(
      carolResult[1].getBalance(),
      carolOfferRules.payoutRules[1].units,
    );

    // 25: Carol deposits her payout to ensure she can
    await carolMoolaPurse.depositAll(carolResult[0]);
    await carolSimoleanPurse.depositAll(carolResult[1]);

    // Dave gets a full refund
    t.deepEquals(daveResult[0].getBalance(), unitOps[0].make(0));
    t.deepEquals(
      daveResult[1].getBalance(),
      daveOfferRules.payoutRules[1].units,
    );

    // 24: Dave deposits his payout to ensure he can
    await daveMoolaPurse.depositAll(daveResult[0]);
    await daveSimoleanPurse.depositAll(daveResult[1]);

    // Assert that the correct payout were received.
    // Alice had 1 moola and 0 simoleans.
    // Bob had 0 moola and 11 simoleans.
    // Carol had 0 moola and 7 simoleans.
    // Dave had 0 moola and 5 simoleans.

    // Now, they should have:
    // Alice: 0 moola and 7 simoleans
    // Bob: 1 moola and 4 simoleans
    // Carol: 0 moola and 7 simoleans
    // Dave: 0 moola and 5 simoleans
    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);
    t.equals(bobMoolaPurse.getBalance().extent, 1);
    t.equals(bobSimoleanPurse.getBalance().extent, 4);
    t.equals(carolMoolaPurse.getBalance().extent, 0);
    t.equals(carolSimoleanPurse.getBalance().extent, 7);
    t.equals(daveMoolaPurse.getBalance().extent, 0);
    t.equals(daveSimoleanPurse.getBalance().extent, 5);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - secondPriceAuction w/ 3 bids - alice exits onDemand', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe({ require });
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(11));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Setup Carol
    const carolMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const carolSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const carolSimoleanPayment = carolSimoleanPurse.withdrawAll();

    // Setup Dave
    const daveMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const daveSimoleanPurse = mints[1].mint(assays[1].makeUnits(5));
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const {
      instance: aliceAuction,
      instanceHandle,
    } = await zoe.makeInstance(installationHandle, { assays, numBidsAllowed });

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(3),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payout: alicePayoutP,
      cancelObj,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice initializes the auction with her escrow receipt
    const aliceOfferResult = await aliceAuction.startAuction(
      aliceEscrowReceipt,
    );

    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // 5: Alice cancels her offer, making the auction stop accepting
    // offers
    cancelObj.cancel();

    // 5: Alice spreads the instanceHandle far and wide with
    // instructions on how to use it and Bob decides he wants to
    // participate in the auction.
    const {
      instance: bobAuction,
      installationHandle: bobInstallationId,
      terms,
    } = zoe.getInstance(instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(terms.assays, assays);

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(11),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payout: bobPayoutP,
    } = await zoe.escrow(bobOfferRules, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    t.rejects(
      bobAuction.bid(bobEscrowReceipt),
      `The item up for auction has been withdrawn`,
    );

    // 9: Carol decides to bid for the one moola

    const {
      instance: carolAuction,
      installationHandle: carolInstallationId,
      terms: carolTerms,
    } = zoe.getInstance(instanceHandle);

    t.equals(carolInstallationId, installationHandle);
    t.deepEquals(carolTerms.assays, assays);

    const carolOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const carolPayments = [undefined, carolSimoleanPayment];

    // 10: Carol escrows with zoe
    const {
      escrowReceipt: carolEscrowReceipt,
      payout: carolPayoutP,
    } = await zoe.escrow(carolOfferRules, carolPayments);

    // 11: Carol makes an offer with her escrow receipt
    t.rejects(
      carolAuction.bid(carolEscrowReceipt),
      `The item up for auction has been withdrawn`,
    );

    // 12: Dave decides to bid for the one moola
    const {
      instance: daveAuction,
      installationHandle: daveInstallationId,
      terms: daveTerms,
    } = zoe.getInstance(instanceHandle);

    t.equals(daveInstallationId, installationHandle);
    t.deepEquals(daveTerms.assays, assays);
    const daveOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(5),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const davePayments = [undefined, daveSimoleanPayment];

    // 13: Dave escrows with zoe
    const {
      escrowReceipt: daveEscrowReceipt,
      payout: davePayoutP,
    } = await zoe.escrow(daveOfferRules, davePayments);

    // 14: Dave makes an offer with his escrow receipt
    t.rejects(
      daveAuction.bid(daveEscrowReceipt),
      `The item up for auction has been withdrawn`,
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;
    const carolResult = await carolPayoutP;
    const daveResult = await davePayoutP;

    // Alice (the creator of the auction) gets back what she put in
    t.deepEquals(
      aliceResult[0].getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(aliceResult[1].getBalance().extent, 0);

    // 23: Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob gets a refund
    t.deepEquals(bobResult[0].getBalance(), unitOps[0].make(0));
    t.deepEquals(bobResult[1].getBalance(), bobOfferRules.payoutRules[1].units);

    // 24: Bob deposits his payout to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Carol gets a full refund
    t.deepEquals(carolResult[0].getBalance(), unitOps[0].make(0));
    t.deepEquals(
      carolResult[1].getBalance(),
      carolOfferRules.payoutRules[1].units,
    );

    // 25: Carol deposits her payout to ensure she can
    await carolMoolaPurse.depositAll(carolResult[0]);
    await carolSimoleanPurse.depositAll(carolResult[1]);

    // Dave gets a full refund
    t.deepEquals(daveResult[0].getBalance(), unitOps[0].make(0));
    t.deepEquals(
      daveResult[1].getBalance(),
      daveOfferRules.payoutRules[1].units,
    );

    // 24: Dave deposits his payout to ensure he can
    await daveMoolaPurse.depositAll(daveResult[0]);
    await daveSimoleanPurse.depositAll(daveResult[1]);

    // Assert that the correct refunds were received.
    // Alice had 1 moola and 0 simoleans.
    // Bob had 0 moola and 11 simoleans.
    // Carol had 0 moola and 7 simoleans.
    // Dave had 0 moola and 5 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 1);
    t.equals(aliceSimoleanPurse.getBalance().extent, 0);
    t.equals(bobMoolaPurse.getBalance().extent, 0);
    t.equals(bobSimoleanPurse.getBalance().extent, 11);
    t.equals(carolMoolaPurse.getBalance().extent, 0);
    t.equals(carolSimoleanPurse.getBalance().extent, 7);
    t.equals(daveMoolaPurse.getBalance().extent, 0);
    t.equals(daveSimoleanPurse.getBalance().extent, 5);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
