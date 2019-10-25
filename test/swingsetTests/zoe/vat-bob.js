import harden from '@agoric/harden';
import { insist } from '../../../util/insist';
import { sameStructure } from '../../../util/sameStructure';

const build = async (E, log, zoe, moolaPurseP, simoleanPurseP, installId) => {
  const showPaymentBalance = async (paymentP, name) => {
    try {
      const assetDesc = await E(paymentP).getBalance();
      log(name, ': balance ', assetDesc);
    } catch (err) {
      console.error(err);
    }
  };

  return harden({
    doAutomaticRefund: async instanceHandle => {
      const {
        instance: automaticRefund,
        installationHandle: automaticRefundInstallationId,
        terms,
      } = await E(zoe).getInstance(instanceHandle);

      // Bob ensures it's the contract he expects
      insist(
        installId === automaticRefundInstallationId,
      )`should be the expected automaticRefund`;

      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);

      insist(
        terms.assays[0] === moolaAssay,
      )`The first assay should be the moola assay`;
      insist(
        terms.assays[1] === simoleanAssay,
      )`The second assay should be the simolean assay`;

      // 1. Bob escrows his offer
      const bobConditions = harden({
        offerDesc: [
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(15),
          },
          {
            rule: 'offerExactly',
            assetDesc: await E(assays[1]).makeAssetDesc(17),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });

      const bobSimoleanPayment = await E(simoleanPurseP).withdrawAll();

      const bobPayments = [undefined, bobSimoleanPayment];

      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        bobConditions,
        bobPayments,
      );

      // 2. Bob makes an offer with his escrow receipt
      const bobOfferMadeDesc = await E(automaticRefund).makeOffer(
        escrowReceipt,
      );

      log(bobOfferMadeDesc);

      const bobResult = await payoutP;

      // 5: Bob deposits his winnings
      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },

    doCoveredCall: async (inviteP, instanceHandle) => {
      // Bob claims all with the Zoe inviteAssay
      const inviteAssay = await E(zoe).getInviteAssay();
      const invite = await E(inviteAssay).claimAll(inviteP);

      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);

      const bobIntendedConditions = harden({
        offerDesc: [
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(3),
          },
          {
            rule: 'offerExactly',
            assetDesc: await E(assays[1]).makeAssetDesc(7),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });

      // Bob checks that the invite is for the right covered call
      const { extent: inviteExtent } = await E(invite).getBalance();
      insist(inviteExtent.instanceHandle === instanceHandle)`wrong instance`;
      insist(inviteExtent.installationHandle === installId)`wrong installation`;
      insist(inviteExtent.status, 'acceptingOffers')`not accepting offers`;
      insist(
        sameStructure(
          inviteExtent.offerToBeMade,
          bobIntendedConditions.offerDesc,
        ),
      )`the offer to be made was not as expected`;

      const contractAssays = await E(zoe).getAssaysForInstance(instanceHandle);
      insist(
        contractAssays[0] === moolaAssay,
      )`The first assay should be the moola assay`;
      insist(
        contractAssays[1] === simoleanAssay,
      )`The second assay should be the simolean assay`;

      // Only after assaying the invite does he unwrap it (destroying
      // the ERTP invite) and accept it
      const unwrappedInvite = await E(invite).unwrap();
      const bobSimoleanPayment = await E(simoleanPurseP).withdrawAll();
      const bobPayments = [undefined, bobSimoleanPayment];

      // Bob escrows
      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        bobIntendedConditions,
        bobPayments,
      );

      // 8: Bob makes an offer with his escrow receipt
      const bobOutcome = await E(unwrappedInvite).makeOffer(escrowReceipt);

      log(bobOutcome);

      const bobResult = await payoutP;

      // 5: Bob deposits his winnings
      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
    doPublicAuction: async instanceHandle => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);
      const { instance: auction, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const conditions = harden({
        offerDesc: [
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(1),
          },
          {
            rule: 'offerAtMost',
            assetDesc: await E(assays[1]).makeAssetDesc(11),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdrawAll();
      const offerPayments = [undefined, simoleanPayment];

      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        conditions,
        offerPayments,
      );

      const offerResult = await E(auction).makeOffer(escrowReceipt);

      log(offerResult);

      const bobResult = await payoutP;

      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
    doPublicSwap: async instanceHandle => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);
      const { instance: swap, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const firstOfferDesc = await E(swap).getFirstOfferDesc();
      const expectedFirstOfferDesc = harden([
        {
          rule: 'offerExactly',
          assetDesc: await E(assays[0]).makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: await E(assays[1]).makeAssetDesc(7),
        },
      ]);
      insist(
        sameStructure(firstOfferDesc, expectedFirstOfferDesc),
      )`Alice's first offer was not what she said`;

      const conditions = harden({
        offerDesc: [
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(3),
          },
          {
            rule: 'offerExactly',
            assetDesc: await E(assays[1]).makeAssetDesc(7),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdrawAll();
      const offerPayments = [undefined, simoleanPayment];

      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        conditions,
        offerPayments,
      );

      const offerResult = await E(swap).matchOffer(escrowReceipt);

      log(offerResult);

      const bobResult = await payoutP;

      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
    doSimpleExchange: async instanceHandle => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);
      const { instance: exchange, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const bobBuyOrderConditions = harden({
        offerDesc: [
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(3),
          },
          {
            rule: 'offerAtMost',
            assetDesc: await E(assays[1]).makeAssetDesc(7),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdrawAll();
      const offerPayments = [undefined, simoleanPayment];

      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        bobBuyOrderConditions,
        offerPayments,
      );

      const offerResult = await E(exchange).addOrder(escrowReceipt);

      log(offerResult);

      const bobResult = await payoutP;

      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
    doAutoswap: async instanceHandle => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);
      const { instance: autoswap, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      const liquidityAssay = await E(autoswap).getLiquidityAssay();
      const allAssays = harden([...assays, liquidityAssay]);
      insist(
        sameStructure(allAssays, terms.assays),
      )`assays were not as expected`;

      // bob checks the price of 2 moola. The price is 1 simolean
      const assetDesc2Moola = await E(moolaAssay).makeAssetDesc(2);
      const simoleanAssetDesc = await E(autoswap).getPrice([
        assetDesc2Moola,
        undefined,
        undefined,
      ]);
      log(simoleanAssetDesc);

      const moolaForSimConditions = harden({
        offerDesc: [
          {
            rule: 'offerExactly',
            assetDesc: await E(allAssays[0]).makeAssetDesc(2),
          },
          {
            rule: 'wantAtLeast',
            assetDesc: await E(allAssays[1]).makeAssetDesc(1),
          },
          {
            rule: 'wantAtLeast',
            assetDesc: await E(allAssays[2]).makeAssetDesc(0),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });

      const moolaPayment = E(moolaPurseP).withdrawAll();
      const moolaForSimPayments = [moolaPayment, undefined, undefined];
      const { escrowReceipt, payout: moolaForSimPayoutP } = await E(zoe).escrow(
        moolaForSimConditions,
        moolaForSimPayments,
      );

      const offerResult = await E(autoswap).makeOffer(escrowReceipt);

      log(offerResult);

      const moolaForSimPayout = await moolaForSimPayoutP;

      await E(moolaPurseP).depositAll(moolaForSimPayout[0]);
      await E(simoleanPurseP).depositAll(moolaForSimPayout[1]);

      // Bob looks up the price of 3 simoleans. It's 6 moola
      const assetDesc3Sims = await E(allAssays[1]).makeAssetDesc(3);
      const moolaAssetDesc = await E(autoswap).getPrice([
        undefined,
        assetDesc3Sims,
      ]);
      log(moolaAssetDesc);

      // Bob makes another offer and swaps
      const bobSimsForMoolaConditions = harden({
        offerDesc: [
          {
            rule: 'wantAtLeast',
            assetDesc: await E(allAssays[0]).makeAssetDesc(6),
          },
          {
            rule: 'offerExactly',
            assetDesc: await E(allAssays[1]).makeAssetDesc(3),
          },
          {
            rule: 'wantAtLeast',
            assetDesc: await E(allAssays[2]).makeAssetDesc(0),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });
      const simoleanAssetDesc2 = await E(assays[1]).makeAssetDesc(3);
      const bobSimoleanPayment = await E(simoleanPurseP).withdraw(
        simoleanAssetDesc2,
      );
      const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

      const {
        escrowReceipt: bobsSimsForMoolaEscrowReceipt,
        payout: bobSimsForMoolaPayoutP,
      } = await E(zoe).escrow(bobSimsForMoolaConditions, simsForMoolaPayments);

      const simsForMoolaOutcome = await E(autoswap).makeOffer(
        bobsSimsForMoolaEscrowReceipt,
      );
      log(simsForMoolaOutcome);

      const simsForMoolaPayout = await bobSimsForMoolaPayoutP;

      await E(moolaPurseP).depositAll(simsForMoolaPayout[0]);
      await E(simoleanPurseP).depositAll(simsForMoolaPayout[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
  });
};

const setup = (syscall, state, helpers) =>
  helpers.makeLiveSlots(syscall, state, E =>
    harden({
      build: (...args) => build(E, helpers.log, ...args),
    }),
  );
export default harden(setup);
