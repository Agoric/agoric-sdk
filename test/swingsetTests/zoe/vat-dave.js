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
            assetDesc: await E(assays[1]).makeAssetDesc(5),
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

      const daveResult = await payoffP;

      await E(moolaPurseP).depositAll(daveResult[0]);
      await E(simoleanPurseP).depositAll(daveResult[1]);

      await showPaymentBalance(moolaPurseP, 'daveMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'daveSimoleanPurse;');
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
