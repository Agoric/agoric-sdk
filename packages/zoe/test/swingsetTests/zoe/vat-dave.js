import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';
import { sameStructure } from '@agoric/ertp/util/sameStructure';


const build = async (E, log, zoe, moolaPurseP, simoleanPurseP, installId) => {
  const showPaymentBalance = async (paymentP, name) => {
    try {
      const units = await E(paymentP).getBalance();
      log(name, ': balance ', units);
    } catch (err) {
      console.error(err);
    }
  };

  return harden({
    doPublicAuction: async instanceHandle => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);
      const { instance: auction, installationHandle, terms } = await E(
        zoe,
      ).getInstance(instanceHandle);

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'wantExactly',
            units: await E(assays[0]).makeUnits(1),
          },
          {
            kind: 'offerAtMost',
            units: await E(assays[1]).makeUnits(5),
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

      const daveResult = await payoutP;

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
