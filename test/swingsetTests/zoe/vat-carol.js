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
    doPublicAuction: async instanceId => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);
      const {
        instance: auction,
        installationId,
        assays: auctionAssays,
      } = await E(zoe).getInstance(instanceId);

      insist(installationId === installId)`wrong installation`;
      insist(sameStructure(assays, auctionAssays))`assays were not as expected`;

      const conditions = harden({
        offerDesc: [
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(1),
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

      const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
        conditions,
        offerPayments,
      );

      const offerResult = await E(auction).makeOffer(escrowReceipt);

      log(offerResult);

      const carolResult = await payoffP;

      await E(moolaPurseP).depositAll(carolResult[0]);
      await E(simoleanPurseP).depositAll(carolResult[1]);

      await showPaymentBalance(moolaPurseP, 'carolMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'carolSimoleanPurse;');
    },
    doPublicSwap: async (instanceId, payoffPaymentP) => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);

      const payoffAssay = await E(zoe).getPayoffAssay();

      const conditions = harden({
        offerDesc: [
          {
            rule: 'offerExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(3),
          },
          {
            rule: 'wantExactly',
            assetDesc: await E(assays[1]).makeAssetDesc(7),
          },
        ],
        exit: {
          kind: 'onDemand',
        },
      });

      const carolPayoffPaymentP = await E(payoffAssay).claimAll(payoffPaymentP);
      const { extent } = await E(carolPayoffPaymentP).getBalance();
      insist(extent.instanceId === instanceId)`same instance`;
      insist(sameStructure(extent.conditions, conditions))`same conditions`;
      const carolPayoffObj = await E(carolPayoffPaymentP).unwrap();
      const payoffP = await E(carolPayoffObj).getPayoff();

      const { installationId, assays: auctionAssays } = await E(
        zoe,
      ).getInstance(instanceId);

      insist(installationId === installId)`wrong installation`;
      insist(sameStructure(assays, auctionAssays))`assays were not as expected`;

      const carolResult = await payoffP;

      await E(moolaPurseP).depositAll(carolResult[0]);
      await E(simoleanPurseP).depositAll(carolResult[1]);

      await showPaymentBalance(moolaPurseP, 'carolMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'carolSimoleanPurse;');
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
