import { E } from '@endo/eventual-send';
import { assert, Fail } from '@agoric/assert';
import { keyEQ } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { showPurseBalance, setupIssuers } from './helpers.js';

import { makePrintLog } from './printLog.js';

const build = async (log, zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, bucks, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP, bucksPurseP] = purses;
  const [_moolaPayment, simoleanPayment, bucksPayment] = payments;
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  let secondPriceAuctionSeatP;

  return Far('davestuff', {
    doSecondPriceAuctionBid: async invitation => {
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      const exclInvitation = await E(invitationIssuer).claim(invitation);
      const { value: invitationValue } = await E(invitationIssuer).getAmountOf(
        exclInvitation,
      );
      installation === installations.secondPriceAuction ||
        Fail`wrong installation`;
      keyEQ(
        harden({ Asset: moolaIssuer, Ask: simoleanIssuer }),
        issuerKeywordRecord,
      ) || Fail`issuerKeywordRecord were not as expected`;
      assert(keyEQ(invitationValue[0].customDetails?.minimumBid, simoleans(3)));
      assert(
        keyEQ(invitationValue[0].customDetails?.auctionedAssets, moola(1)),
      );

      const proposal = harden({
        want: { Asset: moola(1) },
        give: { Bid: simoleans(5) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      secondPriceAuctionSeatP = await E(zoe).offer(
        exclInvitation,
        proposal,
        paymentKeywordRecord,
      );
      log(`Dave: ${await E(secondPriceAuctionSeatP).getOfferResult()}`);
    },
    doSecondPriceAuctionGetPayout: async () => {
      const moolaPayout = await E(secondPriceAuctionSeatP).getPayout('Asset');
      const simoleanPayout = await E(secondPriceAuctionSeatP).getPayout('Bid');

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'daveSimoleanPurse', log);
    },

    doSwapForOption: async (invitation, optionAmounts) => {
      // Dave is looking to buy the option to trade his 7 simoleans for
      // 3 moola, and is willing to pay 1 buck for the option.
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      const exclInvitation = await E(invitationIssuer).claim(invitation);
      const { value: invitationValue } = await E(invitationIssuer).getAmountOf(
        exclInvitation,
      );
      const { source } = await E(installation).getBundle();
      // pick some arbitrary code points as a signature.
      source.includes('asset: give.Asset,') ||
        Fail`source bundle didn't match at "asset: give.Asset,"`;
      source.includes('swap(zcf, firstSeat, matchingSeat)') ||
        Fail`source bundle didn't match at "swap(zcf, firstSeat, matchingSeat)"`;
      source.includes('makeMatchingInvitation') ||
        Fail`source bundle didn't match at "makeMatchingInvitation"`;
      installation === installations.atomicSwap || Fail`wrong installation`;
      keyEQ(
        harden({ Asset: invitationIssuer, Price: bucksIssuer }),
        issuerKeywordRecord,
      ) || Fail`issuerKeywordRecord were not as expected`;

      const { customDetails: invitationCustomDetails } = invitationValue[0];
      assert(typeof invitationCustomDetails === 'object');
      const optionValue = optionAmounts.value;
      const { customDetails: optionCustomDetails } = optionValue[0];
      assert(typeof optionCustomDetails === 'object');

      // Dave expects that Bob has already made an offer in the swap
      // with the following rules:
      keyEQ(invitationCustomDetails.asset, optionAmounts) ||
        Fail`asset is the option`;
      keyEQ(invitationCustomDetails.price, bucks(1n)) || Fail`price is 1 buck`;

      optionValue[0].description === 'exerciseOption' || Fail`wrong invitation`;
      AmountMath.isEqual(
        optionCustomDetails.underlyingAssets.UnderlyingAsset,
        moola(3n),
      ) || Fail`wrong underlying asset`;
      AmountMath.isEqual(
        optionCustomDetails.strikePrice.StrikePrice,
        simoleans(7n),
      ) || Fail`wrong strike price`;
      optionCustomDetails.expirationDate === 100n ||
        Fail`wrong expiration date`;
      optionCustomDetails.timeAuthority === timer || Fail`wrong timer`;

      // Dave escrows his 1 buck with Zoe and forms his proposal
      const daveSwapProposal = harden({
        want: { Asset: optionAmounts },
        give: { Price: bucks(1n) },
      });
      const daveSwapPayments = harden({ Price: bucksPayment });
      const seatP = await E(zoe).offer(
        exclInvitation,
        daveSwapProposal,
        daveSwapPayments,
      );

      log(await E(seatP).getOfferResult());

      const daveOption = await E(seatP).getPayout('Asset');
      const daveBucksPayout = await E(seatP).getPayout('Price');

      // Dave exercises his option by making an offer to the covered
      // call. First, he escrows with Zoe.

      const daveCoveredCallProposal = harden({
        want: { UnderlyingAsset: moola(3) },
        give: { StrikePrice: simoleans(7) },
      });
      const daveCoveredCallPayments = harden({ StrikePrice: simoleanPayment });
      const optionSeatP = await E(zoe).offer(
        daveOption,
        daveCoveredCallProposal,
        daveCoveredCallPayments,
      );

      log(await E(optionSeatP).getOfferResult());

      const moolaPayout = await E(optionSeatP).getPayout('UnderlyingAsset');
      const simoleanPayout = await E(optionSeatP).getPayout('StrikePrice');

      await E(bucksPurseP).deposit(daveBucksPayout);
      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'daveMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'daveSimoleanPurse', log);
      await showPurseBalance(bucksPurseP, 'daveBucksPurse', log);
    },
  });
};

export function buildRootObject() {
  return Far('root', {
    build: (...args) => build(makePrintLog(), ...args),
  });
}
