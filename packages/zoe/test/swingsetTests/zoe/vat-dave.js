import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPurseBalance, setupIssuers } from './helpers';

const build = async (E, log, zoe, issuers, payments, installations, timer) => {
  const {
    moola,
    simoleans,
    bucks,
    purses,
    moolaAmountMath,
    simoleanAmountMath,
  } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP, bucksPurseP] = purses;
  const [_moolaPayment, simoleanPayment, bucksPayment] = payments;
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent[0].instanceHandle,
      );
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(harden([moolaIssuer, simoleanIssuer]), terms.issuers),
        details`issuers were not as expected`,
      );
      assert(sameStructure(inviteExtent[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteExtent[0].auctionedAssets, moola(1)));

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
      const offerPayments = [undefined, simoleanPayment];

      const { seat, payout: payoutP } = await E(zoe).redeem(
        exclInvite,
        offerRules,
        offerPayments,
      );

      const offerResult = await E(seat).bid();

      log(offerResult);

      const daveResult = await payoutP;
      const [moolaPayout, simoleanPayout] = await Promise.all(daveResult);

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'daveSimoleanPurse', log);
    },
    doSwapForOption: async (inviteP, optionAmounts) => {
      // Dave is looking to buy the option to trade his 7 simoleans for
      // 3 moola, and is willing to pay 1 buck for the option.

      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );
      const { installationHandle, terms } = await E(zoe).getInstance(
        inviteExtent[0].instanceHandle,
      );
      assert(
        installationHandle === installations.atomicSwap,
        details`wrong installation`,
      );
      assert(
        sameStructure(harden([inviteIssuer, bucksIssuer]), terms.issuers),
        details`issuers were not as expected`,
      );

      // Dave expects that Bob has already made an offer in the swap
      // with the following rules:
      const expectedBobPayoutRules = harden([
        {
          kind: 'offerAtMost',
          amount: optionAmounts,
        },
        {
          kind: 'wantAtLeast',
          amount: bucks(1),
        },
      ]);
      assert(
        sameStructure(inviteExtent[0].offerMadeRules, expectedBobPayoutRules),
      );
      const optionExtent = optionAmounts.extent;
      assert(
        optionExtent[0].seatDesc === 'exerciseOption',
        details`wrong seat`,
      );
      assert(
        moolaAmountMath.isEqual(optionExtent[0].underlyingAsset, moola(3)),
        details`wrong underlying asset`,
      );
      assert(
        simoleanAmountMath.isEqual(optionExtent[0].strikePrice, simoleans(7)),
        details`wrong strike price`,
      );
      assert(
        optionExtent[0].expirationDate === 100,
        details`wrong expiration date`,
      );
      assert(optionExtent[0].timerAuthority === timer, details`wrong timer`);

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
      const daveSwapPayments = [undefined, bucksPayment];
      const { seat: daveSwapSeat, payout: daveSwapPayoutP } = await E(
        zoe,
      ).redeem(exclInvite, daveSwapOfferRules, daveSwapPayments);

      const daveSwapOutcome = await E(daveSwapSeat).matchOffer();
      log(daveSwapOutcome);

      const daveSwapPayout = await daveSwapPayoutP;
      const [daveOption, daveBucksPayout] = await Promise.all(daveSwapPayout);

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
      const daveCoveredCallPayments = [undefined, simoleanPayment];
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
      const [moolaPayout, simoleanPayout] = await Promise.all(
        daveCoveredCallResult,
      );

      await E(bucksPurseP).deposit(daveBucksPayout);
      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'daveSimoleanPurse', log);
      await showPurseBalance(bucksPurseP, 'daveBucksPurse', log);
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
