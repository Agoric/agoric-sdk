import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPaymentBalance, setupIssuers } from './helpers';

const build = async (E, log, zoe, purses, installations, timer) => {
  const {
    inviteIssuer,
    moolaIssuer,
    simoleanIssuer,
    bucksIssuer,
    moola,
    simoleans,
    bucks,
    moolaAmountMath,
    simoleanAmountMath,
  } = await setupIssuers(zoe, purses);
  const [moolaPurseP, simoleanPurseP, bucksPurseP] = purses;

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
            amount: simoleans(5),
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

      const daveResult = await payoutP;

      await E(moolaPurseP).deposit(daveResult[0]);
      await E(simoleanPurseP).deposit(daveResult[1]);

      await showPaymentBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPaymentBalance(simoleanPurseP, 'daveSimoleanPurse', log);
    },
    doSwapForOption: async (inviteP, optionAmounts) => {
      // Dave is looking to buy the option to trade his 7 simoleans for
      // 3 moola, and is willing to pay 1 buck for the option.

      const invite = await E(inviteIssuer).claim(inviteP);
      const { extent: inviteExtent } = await E(invite).getBalance();
      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent.instanceHandle,
      );
      assert(
        installationHandle === installations.atomicSwap,
        details`wrong installation`,
      );
      assert(
        sameStructure(harden([inviteIssuer, bucksIssuer]), terms.issuers),
        details`issuers were not as expected`,
      );

      /*
      // Dave expects that Bob has already made an offer in the swap
      // with the following rules:
      const expectedBobOfferRules = harden({
        payoutRules: [
          {
            kind: 'offerAtMost',
            amount: optionAmounts,
          },
          {
            kind: 'wantAtLeast',
            amount: bucks(1),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });
      */

      // TODO the following assert is not correct. It always fails when turned on
      // assert(sameStructure(inviteExtent.offerMadeRules, expectedBobOfferRules));
      const optionExtent = optionAmounts.extent;
      assert(optionExtent.seatDesc === 'exerciseOption', details`wrong seat`);
      assert(
        moolaAmountMath.equals(optionExtent.underlyingAsset, moola(3)),
        details`wrong underlying asset`,
      );
      assert(
        simoleanAmountMath.equals(optionExtent.strikePrice, simoleans(7)),
        details`wrong strike price`,
      );
      assert(
        optionExtent.expirationDate === 100,
        details`wrong expiration date`,
      );
      assert(optionExtent.timerAuthority === timer, details`wrong timer`);

      // Dave escrows his 1 buck with Zoe and forms his offerRules
      const daveSwapOfferRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            amount: optionAmounts,
          },
          {
            kind: 'offerAtMost',
            amount: bucks(1),
          },
        ],
        exitRule: {
          kind: 'onDemand',
        },
      });

      const daveBucksPaymentP = E(bucksPurseP).withdraw();
      const daveSwapPayments = [undefined, daveBucksPaymentP];
      const { seat: daveSwapSeat, payout: daveSwapPayoutP } = await E(
        zoe,
      ).redeem(invite, daveSwapOfferRules, daveSwapPayments);

      const daveSwapOutcome = await E(daveSwapSeat).matchOffer();
      log(daveSwapOutcome);

      const [daveOption, daveBucksPayout] = await daveSwapPayoutP;

      // Dave exercises his option by making an offer to the covered
      // call. First, he escrows with Zoe.

      const daveCoveredCallOfferRules = harden({
        payoutRules: [
          {
            kind: 'wantAtLeast',
            amount: moola(3),
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
      const daveSimoleanPaymentP = E(simoleanPurseP).withdraw();
      const daveCoveredCallPayments = [undefined, daveSimoleanPaymentP];
      const {
        seat: daveCoveredCallSeat,
        payout: daveCoveredCallPayoutP,
      } = await E(zoe).redeem(
        daveOption,
        daveCoveredCallOfferRules,
        daveCoveredCallPayments,
      );

      const daveCoveredCallOutcome = await E(daveCoveredCallSeat).exercise();
      log(daveCoveredCallOutcome);

      const daveCoveredCallResult = await daveCoveredCallPayoutP;

      await E(bucksPurseP).deposit(daveBucksPayout);
      await E(moolaPurseP).deposit(daveCoveredCallResult[0]);
      await E(simoleanPurseP).deposit(daveCoveredCallResult[1]);

      await showPaymentBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPaymentBalance(simoleanPurseP, 'daveSimoleanPurse', log);
      await showPaymentBalance(bucksPurseP, 'daveBucksPurse', log);
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
