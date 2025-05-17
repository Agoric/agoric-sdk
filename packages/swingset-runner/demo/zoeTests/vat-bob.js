import { assert, X, Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { keyEQ } from '@agoric/store';
import { AmountMath, isSetValue } from '@agoric/ertp';
import { claim } from '@agoric/ertp/src/legacy-payment-helpers.js';

import { showPurseBalance, setupIssuers } from './helpers.js';

import { makePrintLog } from './printLog.js';

const build = async (log, zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, bucks, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP, bucksPurseP] = purses;
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  let secondPriceAuctionSeatP;

  return Far('build', {
    doAutomaticRefund: async invitation => {
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const exclInvitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitation,
      );

      const issuerKeywordRecord = await E(zoe).getIssuers(instance);

      // Bob ensures it's the contract he expects
      installations.automaticRefund === installation ||
        Fail`should be the expected automaticRefund`;
      issuerKeywordRecord.Contribution1 === moolaIssuer ||
        Fail`The first issuer should be the moola issuer`;
      issuerKeywordRecord.Contribution2 === simoleanIssuer ||
        Fail`The second issuer should be the simolean issuer`;

      // 1. Bob escrows his offer
      const bobProposal = harden({
        want: { Contribution1: moola(15n) },
        give: { Contribution2: simoleans(17n) },
        exit: { onDemand: null },
      });

      const bobPayments = { Contribution2: simoleanPayment };

      // 2. Bob makes an offer
      const bobSeatP = await E(zoe).offer(
        exclInvitation,
        bobProposal,
        bobPayments,
      );
      log(await E(bobSeatP).getOfferResult());

      const moolaPayout = await E(bobSeatP).getPayout('Contribution1');
      const simoleanPayout = await E(bobSeatP).getPayout('Contribution2');

      // 5: Bob deposits his winnings
      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },

    doCoveredCall: async invitation => {
      // Bob claims all with the Zoe invitationIssuer
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const exclInvitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitation,
      );
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);

      const bobIntendedProposal = harden({
        want: { UnderlyingAsset: moola(3n) },
        give: { StrikePrice: simoleans(7n) },
      });

      // Bob checks that the invitation is for the right covered call
      const { value: optionValue } =
        await E(invitationIssuer).getAmountOf(exclInvitation);
      const { customDetails } = optionValue[0];
      assert(typeof customDetails === 'object');
      installation === installations.coveredCall || Fail`wrong installation`;
      optionValue[0].description === 'exerciseOption' || Fail`wrong invitation`;
      assert(
        AmountMath.isEqual(
          customDetails.underlyingAssets.UnderlyingAsset,
          moola(3n),
        ),
      );
      assert(
        AmountMath.isEqual(
          customDetails.strikePrice.StrikePrice,
          simoleans(7n),
        ),
      );
      customDetails.expirationDate === 1n || Fail`wrong expirationDate`;
      assert(customDetails.timeAuthority === timer, 'wrong timer');
      const { UnderlyingAsset, StrikePrice } = issuerKeywordRecord;
      UnderlyingAsset === moolaIssuer ||
        Fail`The underlying asset issuer should be the moola issuer`;
      StrikePrice === simoleanIssuer ||
        Fail`The strike price issuer should be the simolean issuer`;

      const bobPayments = { StrikePrice: simoleanPayment };
      // Bob escrows
      const seatP = await E(zoe).offer(
        exclInvitation,
        bobIntendedProposal,
        bobPayments,
      );

      log(await E(seatP).getOfferResult());

      const moolaPayout = await E(seatP).getPayout('UnderlyingAsset');
      const simoleanPayout = await E(seatP).getPayout('StrikePrice');

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },

    doSwapForOption: async (invitation, daveP) => {
      // Bob claims all with the Zoe invitationIssuer
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const exclInvitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitation,
      );

      const { UnderlyingAsset, StrikePrice } =
        await E(zoe).getIssuers(instance);

      // Bob checks that the invitation is for the right covered call
      const optionAmounts =
        await E(invitationIssuer).getAmountOf(exclInvitation);
      const optionValue = optionAmounts.value;
      const { customDetails } = optionValue[0];
      assert(typeof customDetails === 'object');

      installation === installations.coveredCall || Fail`wrong installation`;
      optionValue[0].description === 'exerciseOption' || Fail`wrong invitation`;
      AmountMath.isEqual(
        customDetails.underlyingAssets.UnderlyingAsset,
        moola(3n),
      ) || Fail`wrong underlying asset`;
      AmountMath.isEqual(
        customDetails.strikePrice.StrikePrice,
        simoleans(7n),
      ) || Fail`wrong strike price`;
      customDetails.expirationDate === 100n || Fail`wrong expiration date`;
      customDetails.timeAuthority === timer || Fail`wrong timer`;
      UnderlyingAsset === moolaIssuer ||
        Fail`The underlyingAsset issuer should be the moola issuer`;
      StrikePrice === simoleanIssuer ||
        Fail`The strikePrice issuer should be the simolean issuer`;

      // Let's imagine that Bob wants to create a swap to trade this
      // invitation for bucks. He wants to invitation Dave as the
      // counter-party.
      const offerIssuerKeywordRecord = harden({
        Asset: invitationIssuer,
        Price: bucksIssuer,
      });
      const { creatorInvitation: bobSwapInvitation } = await E(
        zoe,
      ).startInstance(installations.atomicSwap, offerIssuerKeywordRecord);

      // Bob wants to swap an invitation with the same amount as his
      // current invitation from Alice. He wants 1 buck in return.
      const bobProposalSwap = harden({
        give: { Asset: optionAmounts },
        want: { Price: bucks(1n) },
      });

      const bobSwapPayments = harden({ Asset: exclInvitation });

      // Bob escrows his option in the swap
      const bobSeatP = await E(zoe).offer(
        bobSwapInvitation,
        bobProposalSwap,
        bobSwapPayments,
      );
      const daveSwapInvitationP = E(bobSeatP).getOfferResult();
      // Bob makes an offer to the swap with his "higher order"
      log('swap invitation made');
      await E(daveP).doSwapForOption(daveSwapInvitationP, optionAmounts);

      const bucksPayout = await E(bobSeatP).getPayout('Price');

      // Bob deposits his winnings
      await E(bucksPurseP).deposit(bucksPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
      await showPurseBalance(bucksPurseP, 'bobBucksPurse;', log);
    },
    doSecondPriceAuctionBid: async invitation => {
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      const exclInvitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitation,
      );
      const { value: invitationValue } =
        await E(invitationIssuer).getAmountOf(exclInvitation);
      installation === installations.secondPriceAuction ||
        Fail`wrong installation`;
      keyEQ(
        harden({ Asset: moolaIssuer, Ask: simoleanIssuer }),
        issuerKeywordRecord,
      ) || Fail`issuerKeywordRecord was not as expected`;
      assert(
        keyEQ(invitationValue[0].customDetails?.minimumBid, simoleans(3n)),
      );
      assert(
        keyEQ(invitationValue[0].customDetails?.auctionedAssets, moola(1n)),
      );

      const proposal = harden({
        want: { Asset: moola(1n) },
        give: { Bid: simoleans(11n) },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      secondPriceAuctionSeatP = E(zoe).offer(
        exclInvitation,
        proposal,
        paymentKeywordRecord,
      );
      log(`Bob: ${await E(secondPriceAuctionSeatP).getOfferResult()}`);
    },
    doSecondPriceAuctionGetPayout: async () => {
      const moolaPayout = await E(secondPriceAuctionSeatP).getPayout('Asset');
      const simoleanPayout = await E(secondPriceAuctionSeatP).getPayout('Bid');

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doAtomicSwap: async invitation => {
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      const exclInvitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitation,
      );
      const { value: invitationValue } =
        await E(invitationIssuer).getAmountOf(exclInvitation);
      installation === installations.atomicSwap || Fail`wrong installation`;
      assert(
        keyEQ(
          harden({ Asset: moolaIssuer, Price: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        X`issuers were not as expected`,
      );
      keyEQ(invitationValue[0].customDetails?.asset, moola(3n)) ||
        Fail`Alice made a different offer than expected`;
      keyEQ(invitationValue[0].customDetails?.price, simoleans(7n)) ||
        Fail`Alice made a different offer than expected`;

      const proposal = harden({
        want: { Asset: moola(3n) },
        give: { Price: simoleans(7n) },
      });
      const paymentKeywordRecord = { Price: simoleanPayment };

      const seatP = await E(zoe).offer(
        exclInvitation,
        proposal,
        paymentKeywordRecord,
      );

      log(await E(seatP).getOfferResult());

      const moolaPayout = await E(seatP).getPayout('Asset');
      const simoleanPayout = await E(seatP).getPayout('Price');

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },

    doSimpleExchange: async invitation => {
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const exclInvitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitation,
      );
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      installation === installations.simpleExchange || Fail`wrong installation`;
      issuerKeywordRecord.Asset === moolaIssuer ||
        Fail`The first issuer should be the moola issuer`;
      issuerKeywordRecord.Price === simoleanIssuer ||
        Fail`The second issuer should be the simolean issuer`;

      const bobBuyOrderProposal = harden({
        want: { Asset: moola(3n) },
        give: { Price: simoleans(7n) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Price: simoleanPayment };

      const seatP = await E(zoe).offer(
        exclInvitation,
        bobBuyOrderProposal,
        paymentKeywordRecord,
      );

      log(await E(seatP).getOfferResult());

      const moolaPayout = await E(seatP).getPayout('Asset');
      const simoleanPayout = await E(seatP).getPayout('Price');

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doSimpleExchangeUpdates: async (invitationP, m, s) => {
      const invitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        invitationP,
      );
      const instance = await E(zoe).getInstance(invitation);
      const installation = await E(zoe).getInstallation(invitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      installation === installations.simpleExchange || Fail`wrong installation`;
      issuerKeywordRecord.Asset === moolaIssuer ||
        Fail`The first issuer should be the moola issuer`;
      issuerKeywordRecord.Price === simoleanIssuer ||
        Fail`The second issuer should be the simolean issuer`;
      const bobBuyOrderProposal = harden({
        want: { Asset: moola(m) },
        give: { Price: simoleans(s) },
        exit: { onDemand: null },
      });
      if (m === 3n && s === 7n) {
        await E(simoleanPurseP).deposit(simoleanPayment);
      }
      const simoleanPayment2 = await E(simoleanPurseP).withdraw(simoleans(s));
      const paymentKeywordRecord = { Price: simoleanPayment2 };
      const seatP = await E(zoe).offer(
        invitation,
        bobBuyOrderProposal,
        paymentKeywordRecord,
      );

      log(await E(seatP).getOfferResult());

      E(seatP)
        .getPayout('Asset')
        .then(moolaPayout => {
          E(moolaPurseP).deposit(moolaPayout);
        });
      E(seatP)
        .getPayout('Price')
        .then(simoleanPayout => {
          E(simoleanPurseP).deposit(simoleanPayout);
        });
      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },

    doAutoswap: async instance => {
      const publicFacet = await E(zoe).getPublicFacet(instance);
      const buyBInvitation = await E(publicFacet).makeSwapInInvitation();
      const installation = await E(zoe).getInstallation(buyBInvitation);
      const issuerKeywordRecord = await E(zoe).getIssuers(instance);
      installation === installations.autoswap || Fail`wrong installation`;
      const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
      assert(
        keyEQ(
          harden({
            Central: moolaIssuer,
            Secondary: simoleanIssuer,
            Liquidity: liquidityIssuer,
          }),
          issuerKeywordRecord,
        ),
        X`issuers were not as expected`,
      );

      // bob checks how many simoleans he can get for 3 moola
      const simoleanAmounts = await E(publicFacet).getInputPrice(
        moola(3n),
        simoleans(0n).brand,
      );
      log(`simoleanAmounts `, simoleanAmounts);

      const moolaForSimProposal = harden({
        give: { In: moola(3n) },
        want: { Out: simoleans(1n) },
      });

      const moolaForSimPayments = harden({ In: moolaPayment });
      const buySeatP = await E(zoe).offer(
        buyBInvitation,
        moolaForSimProposal,
        moolaForSimPayments,
      );

      log(await E(buySeatP).getOfferResult());

      const moolaPayout1 = await E(buySeatP).getPayout('In');
      const simoleanPayout1 = await E(buySeatP).getPayout('Out');

      await E(moolaPurseP).deposit(await moolaPayout1);
      await E(simoleanPurseP).deposit(await simoleanPayout1);

      // Bob looks up how much moola he can get for 3 simoleans. It's 5
      const moolaProceeds = await E(publicFacet).getInputPrice(
        simoleans(3n),
        moola(0n).brand,
      );
      log(`moola proceeds `, moolaProceeds);

      // Bob makes another offer and swaps
      const bobSimsForMoolaProposal2 = harden({
        want: { Out: moola(5n) },
        give: { In: simoleans(3n) },
      });
      await E(simoleanPurseP).deposit(simoleanPayment);
      const bobSimPayment2 = await E(simoleanPurseP).withdraw(simoleans(3n));
      const simsForMoolaPayments2 = harden({ In: bobSimPayment2 });
      const invitation2 = E(publicFacet).makeSwapInInvitation();

      const swapSeat2 = await E(zoe).offer(
        invitation2,
        bobSimsForMoolaProposal2,
        simsForMoolaPayments2,
      );

      log(await E(swapSeat2).getOfferResult());

      const moolaPayout2 = await E(swapSeat2).getPayout('Out');
      const simoleanPayout2 = await E(swapSeat2).getPayout('In');

      await E(moolaPurseP).deposit(moolaPayout2);
      await E(simoleanPurseP).deposit(simoleanPayout2);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);

      // Bob looks up how much simoleans he'd have to pay for 3 moola. It's 6
      const simRequired = await E(publicFacet).getOutputPrice(
        moola(3n),
        simoleans(0n).brand,
      );
      log(`simoleans required `, simRequired);
    },

    doBuyTickets: async (instance, invitation) => {
      const publicFacet = await E(zoe).getPublicFacet(instance);
      const terms = await E(zoe).getTerms(instance);
      const ticketIssuer = await E(publicFacet).getItemsIssuer();
      const ticketBrand = await E(ticketIssuer).getBrand();

      const availableTickets = await E(publicFacet).getAvailableItems();
      log('availableTickets: ', availableTickets);
      // find the value corresponding to ticket #1
      assert(isSetValue(availableTickets.value));
      const ticket1Value = availableTickets.value.find(
        ticket => ticket.number === 1,
      );
      // make the corresponding amount
      const ticket1Amount = AmountMath.make(
        ticketBrand,
        harden([ticket1Value]),
      );
      const proposal = harden({
        give: { Money: terms.pricePerItem },
        want: { Items: ticket1Amount },
      });

      const paymentKeywordRecord = harden({ Money: moolaPayment });

      const seat = await E(zoe).offer(
        invitation,
        proposal,
        paymentKeywordRecord,
      );
      const boughtTicketAmount = await E(ticketIssuer).getAmountOf(
        E(seat).getPayout('Items'),
      );
      log('boughtTicketAmount: ', boughtTicketAmount);
    },

    doOTCDesk: async untrustedInvitation => {
      const invitation = await claim(
        E(invitationIssuer).makeEmptyPurse(),
        untrustedInvitation,
      );
      const invitationValue = await E(zoe).getInvitationDetails(invitation);
      assert(invitationValue.installation === installations.coveredCall);

      // Bob can use whatever keywords he wants
      const proposal = harden({
        give: { Whatever1: simoleans(4n) },
        want: { Whatever2: moola(3n) },
        exit: { onDemand: null },
      });
      await E(simoleanPurseP).deposit(simoleanPayment);
      const simoleanPayment1 = await E(simoleanPurseP).withdraw(simoleans(4n));

      const seat = await E(zoe).offer(invitation, proposal, {
        Whatever1: simoleanPayment1,
      });

      log(await E(seat).getOfferResult());

      const moolaPayout = await E(seat).getPayout('Whatever2');
      const simoleansPayout = await E(seat).getPayout('Whatever1');

      log(await E(moolaIssuer).getAmountOf(moolaPayout));
      log(await E(simoleanIssuer).getAmountOf(simoleansPayout));
    },
  });
};

export function buildRootObject() {
  return Far('root', {
    build: (...args) => build(makePrintLog(), ...args),
  });
}
