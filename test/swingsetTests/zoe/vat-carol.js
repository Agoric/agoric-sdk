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
            assetDesc: await E(assays[0]).makeAssetDesc(1),
          },
          {
            kind: 'offerAtMost',
            assetDesc: await E(assays[1]).makeAssetDesc(7),
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

      const carolResult = await payoutP;

      await E(moolaPurseP).depositAll(carolResult[0]);
      await E(simoleanPurseP).depositAll(carolResult[1]);

      await showPaymentBalance(moolaPurseP, 'carolMoolaPurse');
      await showPaymentBalance(simoleanPurseP, 'carolSimoleanPurse;');
    },
    doPublicSwap: async (instanceHandle, payoutPaymentP) => {
      const moolaAssay = await E(moolaPurseP).getAssay();
      const simoleanAssay = await E(simoleanPurseP).getAssay();

      const assays = harden([moolaAssay, simoleanAssay]);

      const payoutAssay = await E(zoe).getPayoutAssay();

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'offerExactly',
            assetDesc: await E(assays[0]).makeAssetDesc(3),
          },
          {
            kind: 'wantExactly',
            assetDesc: await E(assays[1]).makeAssetDesc(7),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });

      const carolPayoutPaymentP = await E(payoutAssay).claimAll(payoutPaymentP);
      const { extent } = await E(carolPayoutPaymentP).getBalance();
      insist(extent.instanceHandle === instanceHandle)`same instance`;
      insist(sameStructure(extent.offerRules, offerRules))`same offerRules`;
      const carolPayoutObj = await E(carolPayoutPaymentP).unwrap();
      const payoutP = await E(carolPayoutObj).getPayout();

      const { installationHandle, terms } = await E(zoe).getInstance(
        instanceHandle,
      );

      insist(installationHandle === installId)`wrong installation`;
      insist(sameStructure(assays, terms.assays))`assays were not as expected`;

      const carolResult = await payoutP;

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
