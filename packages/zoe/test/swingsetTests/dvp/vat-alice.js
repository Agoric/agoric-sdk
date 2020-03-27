import harden from '@agoric/harden';
import { showPurseBalance, getLocalAmountMath } from '../helpers';

const build = async (E, log, zoe, issuers, payments, installations, carolP) => {
  const purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
  const [_, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const simoleanMath = await getLocalAmountMath(simoleanIssuer);
  const [simoleanPurseP] = purses;

  return harden({
    doDelivery: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
debugger
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );
debugger
      const {
        handle: iHandle,
        installationHandle,
        terms,
        issuerKeywordRecord,
      } = await E(zoe).getInstance(inviteExtent[0].instanceHandle);

      // Alice delivers the physical product to Carol out-of-band
      E(carolP).makePhysicalDelivery(terms.Product, iHandle);

      const proposal = harden({
        want: { Currency: simoleanMath.make(7) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Asset: payments[0] };
      const { seat, payout: payoutP } = await E(zoe).redeem(
        invite,
        proposal,
        paymentKeywordRecord,
      );

      // Notify the contract that the delivery has been made.
      E(seat).deliver();

      const payout = await payoutP;
      const simoleanPayout = await payout.Price;

      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
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
