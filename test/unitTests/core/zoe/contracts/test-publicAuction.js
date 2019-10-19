import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';

import { publicAuctionSrcs } from '../../../../../core/zoe/contracts/publicAuction';

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  try {
    const { assays: originalAssays, mints, descOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(11));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Setup Carol
    const carolMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const carolSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const carolSimoleanPayment = carolSimoleanPurse.withdrawAll();

    // Setup Dave
    const daveMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const daveSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(5));
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a secondPriceAuction instance

    const installationId = zoe.install(publicAuctionSrcs);
    const numBidsAllowed = 3;
    const { instance: aliceAuction, instanceId } = await zoe.makeInstance(
      assays,
      installationId,
      [numBidsAllowed],
    );

    // 2: Alice escrows with zoe
    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: assays[1].makeAssetDesc(3),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice initializes the auction with her escrow receipt
    const aliceOfferResult = await aliceAuction.makeOffer(aliceEscrowReceipt);

    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // 5: Alice spreads the instanceId far and wide with
    // instructions on how to use it and Bob decides he wants to
    // participate in the auction.
    const {
      instance: bobAuction,
      installationId: bobInstallationId,
      assays: bobAssays,
    } = zoe.getInstance(instanceId);

    t.equals(bobInstallationId, installationId);
    t.deepEquals(bobAssays, assays);

    const bobConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'offerAtMost',
          assetDesc: assays[1].makeAssetDesc(11),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOfferResult = await bobAuction.makeOffer(bobEscrowReceipt);

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // 9: Carol decides to bid for the one moola

    const {
      instance: carolAuction,
      installationId: carolInstallationId,
      assays: carolAssays,
    } = zoe.getInstance(instanceId);

    t.equals(carolInstallationId, installationId);
    t.deepEquals(carolAssays, assays);

    const carolConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'offerAtMost',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const carolPayments = [undefined, carolSimoleanPayment];

    // 10: Carol escrows with zoe
    const {
      escrowReceipt: carolEscrowReceipt,
      payoff: carolPayoffP,
    } = await zoe.escrow(carolConditions, carolPayments);

    // 11: Carol makes an offer with her escrow receipt
    const carolOfferResult = await carolAuction.makeOffer(carolEscrowReceipt);

    t.equals(
      carolOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // 12: Dave decides to bid for the one moola
    const {
      instance: daveAuction,
      installationId: daveInstallationId,
      assays: daveAssays,
    } = zoe.getInstance(instanceId);

    t.equals(daveInstallationId, installationId);
    t.deepEquals(daveAssays, assays);
    const daveConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'offerAtMost',
          assetDesc: assays[1].makeAssetDesc(5),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const davePayments = [undefined, daveSimoleanPayment];

    // 13: Dave escrows with zoe
    const {
      escrowReceipt: daveEscrowReceipt,
      payoff: davePayoffP,
    } = await zoe.escrow(daveConditions, davePayments);

    // 14: Dave makes an offer with his escrow receipt
    const daveOfferResult = await daveAuction.makeOffer(daveEscrowReceipt);

    t.equals(
      daveOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;
    const carolResult = await carolPayoffP;
    const daveResult = await davePayoffP;

    // Alice (the creator of the auction) gets back the second highest bid
    t.deepEquals(
      aliceResult[1].getBalance(),
      carolConditions.offerDesc[1].assetDesc,
    );

    // Alice didn't get any of what she put in
    t.equals(aliceResult[0].getBalance().extent, 0);

    // 23: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob (the winner of the auction) gets the one moola and the
    // difference between his bid and the price back
    t.deepEquals(bobResult[0].getBalance(), descOps[0].make(1));
    t.deepEquals(bobResult[1].getBalance(), descOps[1].make(4));

    // 24: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Carol gets a full refund
    t.deepEquals(carolResult[0].getBalance(), descOps[0].make(0));
    t.deepEquals(
      carolResult[1].getBalance(),
      carolConditions.offerDesc[1].assetDesc,
    );

    // 25: Carol deposits her winnings to ensure she can
    await carolMoolaPurse.depositAll(carolResult[0]);
    await carolSimoleanPurse.depositAll(carolResult[1]);

    // Dave gets a full refund
    t.deepEquals(daveResult[0].getBalance(), descOps[0].make(0));
    t.deepEquals(
      daveResult[1].getBalance(),
      daveConditions.offerDesc[1].assetDesc,
    );

    // 24: Dave deposits his winnings to ensure he can
    await daveMoolaPurse.depositAll(daveResult[0]);
    await daveSimoleanPurse.depositAll(daveResult[1]);

    // Assert that the correct winnings were received.
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
    const { assays: originalAssays, mints, descOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(11));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Setup Carol
    const carolMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const carolSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const carolSimoleanPayment = carolSimoleanPurse.withdrawAll();

    // Setup Dave
    const daveMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const daveSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(5));
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a secondPriceAuction instance

    const installationId = zoe.install(publicAuctionSrcs);
    const numBidsAllowed = 3;
    const { instance: aliceAuction, instanceId } = await zoe.makeInstance(
      assays,
      installationId,
      [numBidsAllowed],
    );

    // 2: Alice escrows with zoe
    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: assays[1].makeAssetDesc(3),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
      cancelObj,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice initializes the auction with her escrow receipt
    const aliceOfferResult = await aliceAuction.makeOffer(aliceEscrowReceipt);

    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // 5: Alice cancels her offer, making the auction stop accepting
    // offers
    cancelObj.cancel();

    // 5: Alice spreads the instanceId far and wide with
    // instructions on how to use it and Bob decides he wants to
    // participate in the auction.
    const {
      instance: bobAuction,
      installationId: bobInstallationId,
      assays: bobAssays,
    } = zoe.getInstance(instanceId);

    t.equals(bobInstallationId, installationId);
    t.deepEquals(bobAssays, assays);

    const bobConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'offerAtMost',
          assetDesc: assays[1].makeAssetDesc(11),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    t.rejects(
      bobAuction.makeOffer(bobEscrowReceipt),
      `The item up for auction has been withdrawn`,
    );

    // 9: Carol decides to bid for the one moola

    const {
      instance: carolAuction,
      installationId: carolInstallationId,
      assays: carolAssays,
    } = zoe.getInstance(instanceId);

    t.equals(carolInstallationId, installationId);
    t.deepEquals(carolAssays, assays);

    const carolConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'offerAtMost',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const carolPayments = [undefined, carolSimoleanPayment];

    // 10: Carol escrows with zoe
    const {
      escrowReceipt: carolEscrowReceipt,
      payoff: carolPayoffP,
    } = await zoe.escrow(carolConditions, carolPayments);

    // 11: Carol makes an offer with her escrow receipt
    t.rejects(
      carolAuction.makeOffer(carolEscrowReceipt),
      `The item up for auction has been withdrawn`,
    );

    // 12: Dave decides to bid for the one moola
    const {
      instance: daveAuction,
      installationId: daveInstallationId,
      assays: daveAssays,
    } = zoe.getInstance(instanceId);

    t.equals(daveInstallationId, installationId);
    t.deepEquals(daveAssays, assays);
    const daveConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(1),
        },
        {
          rule: 'offerAtMost',
          assetDesc: assays[1].makeAssetDesc(5),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const davePayments = [undefined, daveSimoleanPayment];

    // 13: Dave escrows with zoe
    const {
      escrowReceipt: daveEscrowReceipt,
      payoff: davePayoffP,
    } = await zoe.escrow(daveConditions, davePayments);

    // 14: Dave makes an offer with his escrow receipt
    t.rejects(
      daveAuction.makeOffer(daveEscrowReceipt),
      `The item up for auction has been withdrawn`,
    );

    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;
    const carolResult = await carolPayoffP;
    const daveResult = await davePayoffP;

    // Alice (the creator of the auction) gets back what she put in
    t.deepEquals(
      aliceResult[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );

    // Alice didn't get any of what she wanted
    t.equals(aliceResult[1].getBalance().extent, 0);

    // 23: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob gets a refund
    t.deepEquals(bobResult[0].getBalance(), descOps[0].make(0));
    t.deepEquals(
      bobResult[1].getBalance(),
      bobConditions.offerDesc[1].assetDesc,
    );

    // 24: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Carol gets a full refund
    t.deepEquals(carolResult[0].getBalance(), descOps[0].make(0));
    t.deepEquals(
      carolResult[1].getBalance(),
      carolConditions.offerDesc[1].assetDesc,
    );

    // 25: Carol deposits her winnings to ensure she can
    await carolMoolaPurse.depositAll(carolResult[0]);
    await carolSimoleanPurse.depositAll(carolResult[1]);

    // Dave gets a full refund
    t.deepEquals(daveResult[0].getBalance(), descOps[0].make(0));
    t.deepEquals(
      daveResult[1].getBalance(),
      daveConditions.offerDesc[1].assetDesc,
    );

    // 24: Dave deposits his winnings to ensure he can
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
