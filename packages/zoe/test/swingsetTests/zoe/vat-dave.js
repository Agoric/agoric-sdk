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

      const { installationHandle, terms, roles } = await E(zoe).getInstance(
        inviteExtent[0].instanceHandle,
      );
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: moolaIssuer, Bid: simoleanIssuer }),
          roles,
        ),
        details`roles were not as expected`,
      );
      assert(terms.numBidsAllowed === 3, details`terms not as expected`);
      assert(sameStructure(inviteExtent[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteExtent[0].auctionedAssets, moola(1)));

      const offerRules = harden({
        want: { Asset: moola(1) },
        offer: { Bid: simoleans(5) },
        exitRule: { kind: 'onDemand' },
      });
      const offerPayments = { Bid: simoleanPayment };

      const { payout: payoutP, offerResult } = await E(zoe).redeem(
        exclInvite,
        offerRules,
        offerPayments,
      );

      log(await offerResult);

      const daveResult = await payoutP;
      const moolaPayout = await daveResult.Asset;
      const simoleanPayout = await daveResult.Bid;

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
      const { installationHandle, roles } = await E(zoe).getInstance(
        inviteExtent[0].instanceHandle,
      );
      assert(
        installationHandle === installations.atomicSwap,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: inviteIssuer, Price: bucksIssuer }),
          roles,
        ),
        details`roles were not as expected`,
      );

      // Dave expects that Bob has already made an offer in the swap
      // with the following rules:
      assert(
        sameStructure(inviteExtent[0].asset, optionAmounts),
        details`asset is the option`,
      );
      assert(
        sameStructure(inviteExtent[0].price, bucks(1)),
        details`price is 1 buck`,
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
        want: { Asset: optionAmounts },
        offer: { Price: bucks(1) },
      });
      const daveSwapPayments = harden({ Price: bucksPayment });
      const { payout: daveSwapPayoutP, offerResult: daveSwapOutcome } = await E(
        zoe,
      ).redeem(exclInvite, daveSwapOfferRules, daveSwapPayments);

      log(await daveSwapOutcome);

      const daveSwapPayout = await daveSwapPayoutP;
      const daveOption = await daveSwapPayout.Asset;
      const daveBucksPayout = await daveSwapPayout.Price;

      // Dave exercises his option by making an offer to the covered
      // call. First, he escrows with Zoe.

      const daveCoveredCallOfferRules = harden({
        want: { UnderlyingAsset: moola(3) },
        offer: { StrikePrice: simoleans(7) },
      });
      const daveCoveredCallPayments = harden({ StrikePrice: simoleanPayment });
      const {
        payout: daveCoveredCallPayoutP,
        offerResult: daveCoveredCallOutcome,
      } = await E(zoe).redeem(
        daveOption,
        daveCoveredCallOfferRules,
        daveCoveredCallPayments,
      );

      log(await daveCoveredCallOutcome);

      const daveCoveredCallResult = await daveCoveredCallPayoutP;
      const moolaPayout = await daveCoveredCallResult.UnderlyingAsset;
      const simoleanPayout = await daveCoveredCallResult.StrikePrice;

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
