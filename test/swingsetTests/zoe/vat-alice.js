import harden from '@agoric/harden';

const makeAliceMaker = async (E, log, zoe) => {
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
      const alice = harden({
        doCreateAutomaticRefund: async (bobP, installationIdP) => {
          log(`=> alice.doCreateAutomaticRefund called`);
          // 1: Alice creates the automaticRefund instance

          const moolaAssay = await E(moolaPurse).getAssay();
          const simoleanAssay = await E(simoleanPurse).getAssay();

          const assays = [moolaAssay, simoleanAssay];

          const installationId = await installationIdP;
          const { instance: automaticRefund, instanceId } = await E(
            zoe,
          ).makeInstance(assays, installationId);

          // 2: Alice escrows with Zoe
          const offerDesc = harden([
            {
              rule: 'offerExactly',
              assetDesc: await E(assays[0]).makeAssetDesc(3),
            },
            {
              rule: 'wantExactly',
              assetDesc: await E(assays[1]).makeAssetDesc(7),
            },
          ]);

          const aliceMoolaPayment = await E(moolaPurse).withdrawAll();

          const offerPayments = [aliceMoolaPayment, undefined];

          const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
            offerDesc,
            offerPayments,
          );

          // 4. Alice makes an offer with her escrow receipt
          const offerMadeDesc = await E(automaticRefund).makeOffer(
            escrowReceipt,
          );

          log(offerMadeDesc);

          // 5: Alice sends the automaticRefund instanceId to Bob so he can use
          // it
          await E(bobP).doAutomaticRefund(instanceId);

          const payoff = await payoffP;

          // 8: Alice deposits her refund to ensure she can
          await E(moolaPurse).depositAll(payoff[0]);
          await E(simoleanPurse).depositAll(payoff[1]);

          await showPaymentBalance(moolaPurse, 'aliceMoolaPurse');
          await showPaymentBalance(simoleanPurse, 'aliceSimoleanPurse;');
        },
      });
      return alice;
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
      makeAliceMaker(zoe) {
        return harden(makeAliceMaker(E, log, zoe));
      },
    }),
  );
}
export default harden(setup);
