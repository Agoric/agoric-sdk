import harden from '@agoric/harden';
import { insist } from '../../../util/insist';

const makeBobMaker = async (E, log, zoe) => {
  const showPaymentBalance = async (paymentP, name) => {
    try {
      const assetDesc = await E(paymentP).getBalance();
      log(name, ': balance ', assetDesc);
    } catch (err) {
      console.error(err);
    }
  };

  return harden({
    make(moolaPurse, simoleanPurse) {
      const bob = harden({
        doAutomaticRefund: async instanceId => {
          const { instance: automaticRefund } = await E(zoe).getInstance(
            instanceId,
          );

          const moolaAssay = await E(moolaPurse).getAssay();
          const simoleanAssay = await E(simoleanPurse).getAssay();

          const assays = [moolaAssay, simoleanAssay];

          const contractAssays = await E(zoe).getAssaysForInstance(instanceId);
          insist(
            contractAssays[0] === moolaAssay,
          )`The first assay should be the moola assay`;
          insist(
            contractAssays[1] === simoleanAssay,
          )`The second assay should be the simolean assay`;

          // 1. Bob escrows his offer
          const bobOfferDesc = harden([
            {
              rule: 'wantExactly',
              assetDesc: await E(assays[0]).makeAssetDesc(15),
            },
            {
              rule: 'offerExactly',
              assetDesc: await E(assays[1]).makeAssetDesc(17),
            },
          ]);

          const bobSimoleanPayment = await E(simoleanPurse).withdrawAll();

          const bobPayments = [undefined, bobSimoleanPayment];

          const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
            bobOfferDesc,
            bobPayments,
          );

          // 2. Bob makes an offer with his escrow receipt
          const bobOfferMadeDesc = await E(automaticRefund).makeOffer(
            escrowReceipt,
          );

          log(bobOfferMadeDesc);

          const bobResult = await payoffP;

          // 5: Bob deposits his winnings
          await E(moolaPurse).depositAll(bobResult[0]);
          await E(simoleanPurse).depositAll(bobResult[1]);

          await showPaymentBalance(moolaPurse, 'bobMoolaPurse');
          await showPaymentBalance(simoleanPurse, 'bobSimoleanPurse;');
        },
      });
      return bob;
    },
  });
};

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeBobMaker(zoeHelpers) {
        return harden(makeBobMaker(E, log, zoeHelpers));
      },
    }),
  );
}
export default harden(setup);
