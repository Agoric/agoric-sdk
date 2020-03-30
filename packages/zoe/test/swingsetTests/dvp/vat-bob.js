import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { showPurseBalance, getLocalAmountMath } from '../helpers';

const build = async (E, log, zoe, issuers, payments, installations) => {
  const purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
  const [assurancePurseP] = purses;
  const [simoleanPayment] = payments;
  const [assuranceIssuer, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const simoleanMath = await getLocalAmountMath(simoleanIssuer);

  return harden({
    doPayment: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );
      const { installationHandle, issuerKeywordRecord, terms } = await E(
        zoe,
      ).getInstance(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.dvp,
        details`wrong installation`,
      );
      assert(
        issuerKeywordRecord.Currency === simoleanIssuer,
        details`The Currency issuer should be simoleanIssuer`,
      );
      assert(
        issuerKeywordRecord.Assurance === assuranceIssuer,
        details`The Assurance issuer should be the assuranceIssuer`,
      );
  debugger
      E(simoleanIssuer)
        .getAmountOf(simoleanPayment)
        .then(amount =>
          assert(
            simoleanMath.isGTE(amount, terms.Currency),
            details`The payment available (${amount}) is less than the required Currency (${terms.Currency.extent})`,
          ),
        );

      // Bob makes a proposal
      const bobProposal = harden({
        want: { Assurance: assuranceIssuer.make(terms.Product) },
        give: { Currency: simoleanMath.make(1) },
        exit: { onDemand: null },
      });
debugger
      const bobPayments = { Currency: simoleanPayment };
      const { seat, payout: payoutP } = await E(zoe).redeem(
        exclInvite,
        bobProposal,
        bobPayments,
      );

      // 2. Bob tells zoe the offer has been made
      const outcome = await E(seat).payment();

      log(outcome);

      payoutP.then(payout => {
        // When the payout is made, Bob deposits it.
        const assurancePayoutAmount = E(assurancePurseP).deposit(
          payout.Assurance,
        );
        log(`Bob received the Assurance: ${assurancePayoutAmount}`);
        showPurseBalance(assurancePurseP, 'assurances', log);
      });
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
