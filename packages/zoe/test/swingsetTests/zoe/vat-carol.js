import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPaymentBalance, setupAssays } from './helpers';

const build = async (E, log, zoe, purses, installations) => {
  const {
    inviteAssay,
    moolaAssay,
    simoleanAssay,
    moola,
    simoleans,
  } = await setupAssays(zoe, purses);
  const [moolaPurseP, simoleanPurseP] = purses;

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await E(inviteAssay).claimAll(inviteP);
      const { extent: inviteExtent } = await E(invite).getBalance();

      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent.instanceHandle,
      );
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(harden([moolaAssay, simoleanAssay]), terms.assays),
        details`assays were not as expected`,
      );
      assert(sameStructure(inviteExtent.minimumBid, simoleans(3)));
      assert(sameStructure(inviteExtent.auctionedAssets, moola(1)));

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            units: moola(1),
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

      const offerResult = await E(seat).bid();

      log(offerResult);

      const carolResult = await payoutP;

      await E(moolaPurseP).depositAll(carolResult[0]);
      await E(simoleanPurseP).depositAll(carolResult[1]);

      await showPaymentBalance(moolaPurseP, 'carolMoolaPurse', log);
      await showPaymentBalance(simoleanPurseP, 'carolSimoleanPurse', log);
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
