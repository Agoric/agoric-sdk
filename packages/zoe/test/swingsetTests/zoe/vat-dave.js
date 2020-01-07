import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';
import { sameStructure } from '@agoric/ertp/util/sameStructure';
import { showPaymentBalance, setupAssays } from './helpers';

const build = async (E, log, zoe, moolaPurseP, simoleanPurseP, installId) => {
  const {
    inviteAssay,
    moolaAssay,
    simoleanAssay,
    moola,
    simoleans,
  } = await setupAssays(zoe, moolaPurseP, simoleanPurseP);

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await E(inviteAssay).claimAll(inviteP);
      const { extent: inviteExtent } = await E(invite).getBalance();

      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent.instanceHandle,
      );
      insist(installationHandle === installId)`wrong installation`;
      insist(
        sameStructure(harden([moolaAssay, simoleanAssay]), terms.assays),
      )`assays were not as expected`;
      insist(sameStructure(inviteExtent.minimumBid, simoleans(3)));
      insist(sameStructure(inviteExtent.auctionedAssets, moola(1)));

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: moola(1),
          },
          {
            kind: 'offerAtMost',
            units: simoleans(5),
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

      const offerResult = await E(seat).bid();

      log(offerResult);

      const daveResult = await payoutP;

      await E(moolaPurseP).depositAll(daveResult[0]);
      await E(simoleanPurseP).depositAll(daveResult[1]);

      await showPaymentBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPaymentBalance(simoleanPurseP, 'daveSimoleanPurse', log);
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
