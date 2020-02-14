import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPaymentBalance, setupIssuers } from './helpers';

const build = async (E, log, zoe, purses, installations) => {
  const {
    inviteIssuer,
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
  } = await setupIssuers(zoe, purses);
  const [moolaPurseP, simoleanPurseP] = purses;

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await E(inviteIssuer).claim(inviteP);
      const { extent: inviteExtent } = await E(invite).getBalance();

      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent.instanceHandle,
      );
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(harden([moolaIssuer, simoleanIssuer]), terms.issuers),
        details`issuers were not as expected`,
      );
      assert(sameStructure(inviteExtent.minimumBid, simoleans(3)));
      assert(sameStructure(inviteExtent.auctionedAssets, moola(1)));

      const offerRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            amount: moola(1),
          },
          {
            kind: 'offerAtMost',
            amount: simoleans(7),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });
      const simoleanPayment = await E(simoleanPurseP).withdraw();
      const offerPayments = [undefined, simoleanPayment];

      const { seat, payout: payoutP } = await E(zoe).redeem(
        invite,
        offerRules,
        offerPayments,
      );

      const offerResult = await E(seat).bid();

      log(offerResult);

      const carolResult = await payoutP;

      await E(moolaPurseP).deposit(carolResult[0]);
      await E(simoleanPurseP).deposit(carolResult[1]);

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
