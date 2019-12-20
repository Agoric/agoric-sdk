import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';
import { sameStructure } from '@agoric/ertp/util/sameStructure';
import { showPaymentBalance, setupAssays } from './helpers';

const build = async (
  E,
  log,
  zoe,
  moolaPurseP,
  simoleanPurseP,
  installId,
  _timer,
) => {
  const {
    inviteAssay,
    assays,
    moolaAssay,
    simoleanAssay,
    moola,
    simoleans,
  } = await setupAssays(zoe, moolaPurseP, simoleanPurseP);

  return harden({
    doAutomaticRefund: async inviteP => {
      const invite = await E(inviteAssay).claimAll(inviteP);
      const {
        extent: { instanceHandle },
      } = await E(invite).getBalance();

      const { installationHandle, terms } = await E(zoe).getInstance(
        instanceHandle,
      );

      // Bob ensures it's the contract he expects
      insist(
        installId === installationHandle,
      )`should be the expected automaticRefund`;

      insist(
        terms.assays[0] === moolaAssay,
      )`The first assay should be the moola assay`;
      insist(
        terms.assays[1] === simoleanAssay,
      )`The second assay should be the simolean assay`;

      // 1. Bob escrows his offer
      const bobOfferRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: moola(15),
          },
          {
            kind: 'offerAtMost',
            units: simoleans(17),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });

      const bobSimoleanPayment = await E(simoleanPurseP).withdrawAll();

      const bobPayments = [undefined, bobSimoleanPayment];

      const { seat, payout: payoutP } = await E(zoe).redeem(
        invite,
        bobOfferRules,
        bobPayments,
      );

      // 2. Bob makes an offer with his escrow receipt
      const outcome = await E(seat).makeOffer();

      log(outcome);

      const bobResult = await payoutP;

      // 5: Bob deposits his winnings
      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;', log);
    },

    doCoveredCall: async (inviteP, instanceHandle) => {
      // Bob claims all with the Zoe inviteAssay
      const invite = await E(inviteAssay).claimAll(inviteP);

      const bobIntendedOfferRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: await E(assays[0]).makeUnits(3),
          },
          {
            kind: 'offerAtMost',
            units: await E(assays[1]).makeUnits(7),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });

      // Bob checks that the invite is for the right covered call
      const { extent: inviteExtent } = await E(invite).getBalance();
      insist(inviteExtent.instanceHandle === instanceHandle)`wrong instance`;

      const instanceInfo = await E(zoe).getInstance(instanceHandle);

      insist(instanceInfo.installationHandle === installId)`wrong installation`;
      insist(
        sameStructure(
          inviteExtent.offerToBeMade,
          bobIntendedOfferRules.payoutRules,
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
        bobIntendedOfferRules,
        bobPayments,
      );

      // 8: Bob makes an offer with his escrow receipt
      const bobOutcome = await E(unwrappedInvite).matchOffer(escrowReceipt);

      log(bobOutcome);

      const bobResult = await payoutP;

      // 5: Bob deposits his winnings
      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
    doPublicAuction: async instanceHandle => {
      const { instance: auction, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: await E(assays[0]).makeUnits(1),
          },
          {
            kind: 'offerAtMost',
            units: await E(assays[1]).makeUnits(11),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdrawAll();
      const offerPayments = [undefined, simoleanPayment];

      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        offerRules,
        offerPayments,
      );

      const offerResult = await E(auction).bid(escrowReceipt);

      log(offerResult);

      const bobResult = await payoutP;

      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;');
    },
    doPublicSwap: async inviteP => {
      const invite = await E(inviteAssay).claimAll(inviteP);
      const { extent: inviteExtent } = await E(invite).getBalance();

      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent.instanceHandle,
      );
      insist(installationHandle === installId)`wrong installation`;
      insist(
        sameStructure(harden([moolaAssay, simoleanAssay]), terms.assays),
      )`assays were not as expected`;

      const expectedFirstOfferPayoutRules = harden([
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ]);
      insist(
        sameStructure(
          inviteExtent.offerMadeRules,
          expectedFirstOfferPayoutRules,
        ),
      )`Alice made a different offer than expected`;

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: moola(3),
          },
          {
            kind: 'offerAtMost',
            units: simoleans(7),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdrawAll();
      const offerPayments = [undefined, simoleanPayment];

      const { seat, payout: payoutP } = await E(zoe).redeem(
        invite,
        offerRules,
        offerPayments,
      );

      const offerResult = await E(seat).matchOffer();

      log(offerResult);

      const bobResult = await payoutP;

      await E(moolaPurseP).depositAll(bobResult[0]);
      await E(simoleanPurseP).depositAll(bobResult[1]);

      await showPaymentBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPaymentBalance(simoleanPurseP, 'bobSimoleanPurse;', log);
    },
    doSimpleExchange: async instanceHandle => {
      const { instance: exchange, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const bobBuyOrderOfferRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: await E(assays[0]).makeUnits(3),
          },
          {
            kind: 'offerAtMost',
            units: await E(assays[1]).makeUnits(7),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdrawAll();
      const offerPayments = [undefined, simoleanPayment];

      const { escrowReceipt, payout: payoutP } = await E(zoe).escrow(
        bobBuyOrderOfferRules,
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
      const units2Moola = await E(moolaAssay).makeUnits(2);
      const simoleanUnits = await E(autoswap).getPrice([
        units2Moola,
        undefined,
        undefined,
      ]);
      log(simoleanUnits);

      const moolaForSimOfferRules = harden({
        payoutRules: [
          {
            kind: 'offerAtMost',
            units: await E(allAssays[0]).makeUnits(2),
          },
          {
            kind: 'wantAtLeast',
            units: await E(allAssays[1]).makeUnits(1),
          },
          {
            kind: 'wantAtLeast',
            units: await E(allAssays[2]).makeUnits(0),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });

      const moolaPayment = E(moolaPurseP).withdrawAll();
      const moolaForSimPayments = [moolaPayment, undefined, undefined];
      const { escrowReceipt, payout: moolaForSimPayoutP } = await E(zoe).escrow(
        moolaForSimOfferRules,
        moolaForSimPayments,
      );

      const offerResult = await E(autoswap).makeOffer(escrowReceipt);

      log(offerResult);

      const moolaForSimPayout = await moolaForSimPayoutP;

      await E(moolaPurseP).depositAll(moolaForSimPayout[0]);
      await E(simoleanPurseP).depositAll(moolaForSimPayout[1]);

      // Bob looks up the price of 3 simoleans. It's 6 moola
      const units3Sims = await E(allAssays[1]).makeUnits(3);
      const moolaUnits = await E(autoswap).getPrice([undefined, units3Sims]);
      log(moolaUnits);

      // Bob makes another offer and swaps
      const bobSimsForMoolaOfferRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: await E(allAssays[0]).makeUnits(6),
          },
          {
            kind: 'offerAtMost',
            units: await E(allAssays[1]).makeUnits(3),
          },
          {
            kind: 'wantAtLeast',
            units: await E(allAssays[2]).makeUnits(0),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });
      const simoleanUnits2 = await E(assays[1]).makeUnits(3);
      const bobSimoleanPayment = await E(simoleanPurseP).withdraw(
        simoleanUnits2,
      );
      const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

      const {
        escrowReceipt: bobsSimsForMoolaEscrowReceipt,
        payout: bobSimsForMoolaPayoutP,
      } = await E(zoe).escrow(bobSimsForMoolaOfferRules, simsForMoolaPayments);

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
