/* global harden */

import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPurseBalance, setupIssuers } from './helpers';
import { makePrintLog } from './printLog';

const log = makePrintLog();

const build = async (zoe, issuers, payments, installations, timer) => {
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
  const inviteIssuer = await E(zoe).getInvitationIssuer();

  return harden({
    doPublicAuction: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, terms, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteValue[0].instanceHandle);
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: moolaIssuer, Ask: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        details`issuerKeywordRecord were not as expected`,
      );
      assert(terms.numBidsAllowed === 3, details`terms not as expected`);
      assert(sameStructure(inviteValue[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteValue[0].auctionedAssets, moola(1)));

      const proposal = harden({
        want: { Asset: moola(1) },
        give: { Bid: simoleans(5) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        exclInvite,
        proposal,
        paymentKeywordRecord,
      );

      log(await outcomeP);

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
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );
      const getInstanceHandle = iP =>
        E(inviteIssuer)
          .getAmountOf(iP)
          .then(amount => amount.value[0].instanceHandle);
      const instanceHandle = await getInstanceHandle(exclInvite);
      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(instanceHandle);
      const installationBundle = await E(zoe).getInstallation(
        installationHandle,
      );
      // pick some arbitrary code points as a signature.
      assert(
        installationBundle.source.includes('asset: give.Asset,'),
        details`source bundle didn't match at "asset: give.Asset,"`,
      );
      assert(
        installationBundle.source.includes('firstOfferExpected'),
        details`source bundle didn't match at "firstOfferExpected"`,
      );
      assert(
        installationBundle.source.includes('makeMatchingInvite'),
        details`source bundle didn't match at "makeMatchingInvite"`,
      );
      assert(
        installationHandle === installations.atomicSwap,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: inviteIssuer, Price: bucksIssuer }),
          issuerKeywordRecord,
        ),
        details`issuerKeywordRecord were not as expected`,
      );

      // Dave expects that Bob has already made an offer in the swap
      // with the following rules:
      assert(
        sameStructure(inviteValue[0].asset, optionAmounts),
        details`asset is the option`,
      );
      assert(
        sameStructure(inviteValue[0].price, bucks(1)),
        details`price is 1 buck`,
      );
      const optionValue = optionAmounts.value;
      assert(
        optionValue[0].description === 'exerciseOption',
        details`wrong invite`,
      );
      assert(
        moolaAmountMath.isEqual(optionValue[0].underlyingAsset, moola(3)),
        details`wrong underlying asset`,
      );
      assert(
        simoleanAmountMath.isEqual(optionValue[0].strikePrice, simoleans(7)),
        details`wrong strike price`,
      );
      assert(
        optionValue[0].expirationDate === 100,
        details`wrong expiration date`,
      );
      assert(optionValue[0].timerAuthority === timer, details`wrong timer`);

      // Dave escrows his 1 buck with Zoe and forms his proposal
      const daveSwapProposal = harden({
        want: { Asset: optionAmounts },
        give: { Price: bucks(1) },
      });
      const daveSwapPayments = harden({ Price: bucksPayment });
      const { payout: daveSwapPayoutP, outcome: daveSwapOutcomeP } = await E(
        zoe,
      ).offer(exclInvite, daveSwapProposal, daveSwapPayments);

      log(await daveSwapOutcomeP);

      const daveSwapPayout = await daveSwapPayoutP;
      const daveOption = await daveSwapPayout.Asset;
      const daveBucksPayout = await daveSwapPayout.Price;

      // Dave exercises his option by making an offer to the covered
      // call. First, he escrows with Zoe.

      const daveCoveredCallProposal = harden({
        want: { UnderlyingAsset: moola(3) },
        give: { StrikePrice: simoleans(7) },
      });
      const daveCoveredCallPayments = harden({ StrikePrice: simoleanPayment });
      const {
        payout: daveCoveredCallPayoutP,
        outcome: daveCoveredCallOutcomeP,
      } = await E(zoe).offer(
        daveOption,
        daveCoveredCallProposal,
        daveCoveredCallPayments,
      );

      log(await daveCoveredCallOutcomeP);

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

export function buildRootObject(_vatPowers) {
  return harden({ build });
}
