import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPurseBalance, setupIssuers } from '../helpers';
import { makeGetInstanceHandle } from '../../../src/clientSupport';

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
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  return harden({
    doAutomaticRefund: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const instanceHandle = await getInstanceHandle(exclInvite);

      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(instanceHandle);

      // Bob ensures it's the contract he expects
      assert(
        installations.automaticRefund === installationHandle,
        details`should be the expected automaticRefund`,
      );

      assert(
        issuerKeywordRecord.Contribution1 === moolaIssuer,
        details`The first issuer should be the moola issuer`,
      );
      assert(
        issuerKeywordRecord.Contribution2 === simoleanIssuer,
        details`The second issuer should be the simolean issuer`,
      );

      // 1. Bob escrows his offer
      const bobProposal = harden({
        want: { Contribution1: moola(15) },
        give: { Contribution2: simoleans(17) },
        exit: { onDemand: null },
      });

      const bobPayments = { Contribution2: simoleanPayment };

      // 2. Bob makes an offer
      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        exclInvite,
        bobProposal,
        bobPayments,
      );
      log(await outcomeP);

      const bobResult = await payoutP;
      const moolaPayout = await bobResult.Contribution1;
      const simoleanPayout = await bobResult.Contribution2;

      // 5: Bob deposits his winnings
      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },

    doCoveredCall: async inviteP => {
      // Bob claims all with the Zoe inviteIssuer
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);

      const bobIntendedProposal = harden({
        want: { UnderlyingAsset: moola(3) },
        give: { StrikePrice: simoleans(7) },
      });

      // Bob checks that the invite is for the right covered call
      const { extent: optionExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );
      assert(
        optionExtent[0].installationHandle === installations.coveredCall,
        details`wrong installation`,
      );
      assert(
        optionExtent[0].inviteDesc === 'exerciseOption',
        details`wrong invite`,
      );
      assert(
        moolaAmountMath.isEqual(optionExtent[0].underlyingAsset, moola(3)),
      );
      assert(
        simoleanAmountMath.isEqual(optionExtent[0].strikePrice, simoleans(7)),
      );
      assert(
        optionExtent[0].expirationDate === 1,
        details`wrong expirationDate`,
      );
      assert(optionExtent[0].timerAuthority === timer, 'wrong timer');

      const {
        issuerKeywordRecord: { UnderlyingAsset, StrikePrice },
      } = await E(zoe).getInstanceRecord(optionExtent[0].instanceHandle);

      assert(
        UnderlyingAsset === moolaIssuer,
        details`The underlying asset issuer should be the moola issuer`,
      );
      assert(
        StrikePrice === simoleanIssuer,
        details`The strike price issuer should be the simolean issuer`,
      );

      const bobPayments = { StrikePrice: simoleanPayment };

      // Bob escrows
      const { payout: payoutP, outcome: bobOutcomeP } = await E(zoe).offer(
        exclInvite,
        bobIntendedProposal,
        bobPayments,
      );

      log(await bobOutcomeP);

      const bobResult = await payoutP;
      const moolaPayout = await bobResult.UnderlyingAsset;
      const simoleanPayout = await bobResult.StrikePrice;

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doSwapForOption: async (inviteP, daveP) => {
      // Bob claims all with the Zoe inviteIssuer
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);

      // Bob checks that the invite is for the right covered call
      const optionAmounts = await E(inviteIssuer).getAmountOf(exclInvite);
      const optionExtent = optionAmounts.extent;

      assert(
        optionExtent[0].installationHandle === installations.coveredCall,
        details`wrong installation`,
      );
      assert(
        optionExtent[0].inviteDesc === 'exerciseOption',
        details`wrong invite`,
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
      const {
        issuerKeywordRecord: { UnderlyingAsset, StrikePrice },
      } = await E(zoe).getInstanceRecord(optionExtent[0].instanceHandle);
      assert(
        UnderlyingAsset === moolaIssuer,
        details`The underlyingAsset issuer should be the moola issuer`,
      );
      assert(
        StrikePrice === simoleanIssuer,
        details`The strikePrice issuer should be the simolean issuer`,
      );

      // Let's imagine that Bob wants to create a swap to trade this
      // invite for bucks. He wants to invite Dave as the
      // counter-party.
      const issuerKeywordRecord = harden({
        Asset: inviteIssuer,
        Price: bucksIssuer,
      });
      const { invite: bobSwapInvite } = await E(zoe).makeInstance(
        installations.atomicSwap,
        issuerKeywordRecord,
      );

      // Bob wants to swap an invite with the same amount as his
      // current invite from Alice. He wants 1 buck in return.
      const bobProposalSwap = harden({
        give: { Asset: optionAmounts },
        want: { Price: bucks(1) },
      });

      const bobSwapPayments = harden({ Asset: exclInvite });

      // Bob escrows his option in the swap
      const { payout: payoutP, outcome: daveSwapInviteP } = await E(zoe).offer(
        bobSwapInvite,
        bobProposalSwap,
        bobSwapPayments,
      );

      // Bob makes an offer to the swap with his "higher order"
      log('swap invite made');
      await E(daveP).doSwapForOption(daveSwapInviteP, optionAmounts);

      const bobResult = await payoutP;
      const bucksPayout = await bobResult.Price;

      // Bob deposits his winnings
      await E(bucksPurseP).deposit(bucksPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
      await showPurseBalance(bucksPurseP, 'bobBucksPurse;', log);
    },
    doPublicAuction: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, issuerKeywordRecord, terms } = await E(
        zoe,
      ).getInstanceRecord(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.publicAuction,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: moolaIssuer, Bid: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        details`issuerKeywordRecord was not as expected`,
      );
      assert(terms.numBidsAllowed === 3, details`terms not as expected`);
      assert(sameStructure(inviteExtent[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteExtent[0].auctionedAssets, moola(1)));

      const proposal = harden({
        want: { Asset: moola(1) },
        give: { Bid: simoleans(11) },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        exclInvite,
        proposal,
        paymentKeywordRecord,
      );

      log(await outcomeP);

      const bobResult = await payoutP;
      const moolaPayout = await bobResult.Asset;
      const simoleanPayout = await bobResult.Bid;

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doAtomicSwap: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.atomicSwap,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Asset: moolaIssuer, Price: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        details`issuers were not as expected`,
      );

      assert(
        sameStructure(inviteExtent[0].asset, moola(3)),
        details`Alice made a different offer than expected`,
      );
      assert(
        sameStructure(inviteExtent[0].price, simoleans(7)),
        details`Alice made a different offer than expected`,
      );

      const proposal = harden({
        want: { Asset: moola(3) },
        give: { Price: simoleans(7) },
      });
      const paymentKeywordRecord = { Price: simoleanPayment };

      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        exclInvite,
        proposal,
        paymentKeywordRecord,
      );

      log(await outcomeP);

      const bobResult = await payoutP;
      const moolaPayout = await bobResult.Asset;
      const simoleanPayout = await bobResult.Price;

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doSimpleExchange: async inviteP => {
      const invite = await inviteP;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.simpleExchange,
        details`wrong installation`,
      );
      assert(
        issuerKeywordRecord.Asset === moolaIssuer,
        details`The first issuer should be the moola issuer`,
      );
      assert(
        issuerKeywordRecord.Price === simoleanIssuer,
        details`The second issuer should be the simolean issuer`,
      );

      const bobBuyOrderProposal = harden({
        want: { Asset: moola(3) },
        give: { Price: simoleans(7) },
        exit: { onDemand: null },
      });
      const paymentKeywordRecord = { Price: simoleanPayment };

      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        exclInvite,
        bobBuyOrderProposal,
        paymentKeywordRecord,
      );

      log(await outcomeP);

      const bobResult = await payoutP;
      const moolaPayout = await bobResult.Asset;
      const simoleanPayout = await bobResult.Price;

      await E(moolaPurseP).deposit(moolaPayout);
      await E(simoleanPurseP).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doSimpleExchangeUpdates: async (inviteP, m, s) => {
      const invite = await E(inviteIssuer).claim(inviteP);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        invite,
      );
      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.simpleExchange,
        details`wrong installation`,
      );
      assert(
        issuerKeywordRecord.Asset === moolaIssuer,
        details`The first issuer should be the moola issuer`,
      );
      assert(
        issuerKeywordRecord.Price === simoleanIssuer,
        details`The second issuer should be the simolean issuer`,
      );
      const bobBuyOrderProposal = harden({
        want: { Asset: moola(m) },
        give: { Price: simoleans(s) },
        exit: { onDemand: null },
      });
      if (m === 3 && s === 7) {
        await E(simoleanPurseP).deposit(simoleanPayment);
      }
      const simoleanPayment2 = await E(simoleanPurseP).withdraw(simoleans(s));
      const paymentKeywordRecord = { Price: simoleanPayment2 };
      const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
        invite,
        bobBuyOrderProposal,
        paymentKeywordRecord,
      );

      log(await outcomeP);

      payoutP.then(async bobResult => {
        E(moolaPurseP).deposit(await bobResult.Asset);
        E(simoleanPurseP).deposit(await bobResult.Price);
      });

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doAutoswap: async instanceHandle => {
      const { installationHandle, issuerKeywordRecord, publicAPI } = await E(
        zoe,
      ).getInstanceRecord(instanceHandle);
      assert(
        installationHandle === installations.autoswap,
        details`wrong installation`,
      );
      const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();
      assert(
        sameStructure(
          harden({
            TokenA: moolaIssuer,
            TokenB: simoleanIssuer,
            Liquidity: liquidityIssuer,
          }),
          issuerKeywordRecord,
        ),
        details`issuers were not as expected`,
      );

      // bob checks the price of 3 moola. The price is 1 simolean
      const simoleanAmounts = await E(publicAPI).getCurrentPrice(
        harden({ TokenA: moola(3) }),
      );
      log(`simoleanAmounts `, simoleanAmounts);

      const buyBInvite = E(publicAPI).makeSwapInvite();

      const moolaForSimProposal = harden({
        give: { TokenA: moola(3) },
        want: { TokenB: simoleans(1) },
      });

      const moolaForSimPayments = harden({ TokenA: moolaPayment });
      const { payout: moolaForSimPayoutP, outcome: outcomeP } = await E(
        zoe,
      ).offer(buyBInvite, moolaForSimProposal, moolaForSimPayments);

      log(await outcomeP);
      const moolaForSimPayout = await moolaForSimPayoutP;
      const moolaPayout1 = await moolaForSimPayout.TokenA;
      const simoleanPayout1 = await moolaForSimPayout.TokenB;

      await E(moolaPurseP).deposit(moolaPayout1);
      await E(simoleanPurseP).deposit(simoleanPayout1);

      // Bob looks up the price of 3 simoleans. It's 5 moola
      const moolaAmounts = await E(publicAPI).getCurrentPrice(
        harden({ TokenB: simoleans(3) }),
      );
      log(`moolaAmounts `, moolaAmounts);

      // Bob makes another offer and swaps
      const bobSimsForMoolaProposal = harden({
        want: { TokenA: moola(5) },
        give: { TokenB: simoleans(3) },
      });
      await E(simoleanPurseP).deposit(simoleanPayment);
      const bobSimoleanPayment = await E(simoleanPurseP).withdraw(simoleans(3));
      const simsForMoolaPayments = harden({ TokenB: bobSimoleanPayment });
      const invite2 = E(publicAPI).makeSwapInvite();

      const {
        payout: bobSimsForMoolaPayoutP,
        outcome: simsForMoolaOutcomeP,
      } = await E(zoe).offer(
        invite2,
        bobSimsForMoolaProposal,
        simsForMoolaPayments,
      );

      log(await simsForMoolaOutcomeP);

      const simsForMoolaPayout = await bobSimsForMoolaPayoutP;
      const moolaPayout2 = await simsForMoolaPayout.TokenA;
      const simoleanPayout2 = await simsForMoolaPayout.TokenB;

      await E(moolaPurseP).deposit(moolaPayout2);
      await E(simoleanPurseP).deposit(simoleanPayout2);

      await showPurseBalance(moolaPurseP, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'bobSimoleanPurse', log);
    },
    doBuyTickets: async ticketSalesInstanceHandle => {
      const { publicAPI: ticketSalesPublicAPI, terms } = await E(
        zoe,
      ).getInstanceRecord(ticketSalesInstanceHandle);
      const ticketIssuer = await E(ticketSalesPublicAPI).getItemsIssuer();
      const ticketAmountMath = await E(ticketIssuer).getAmountMath();

      // Bob makes an invite
      const invite = await E(ticketSalesPublicAPI).makeBuyerInvite();

      const availableTickets = await E(
        ticketSalesPublicAPI,
      ).getAvailableItems();
      log('availableTickets: ', availableTickets);

      // find the extent corresponding to ticket #1
      const ticket1Extent = availableTickets.extent.find(
        ticket => ticket.number === 1,
      );
      // make the corresponding amount
      const ticket1Amount = await E(ticketAmountMath).make(
        harden([ticket1Extent]),
      );

      const proposal = harden({
        give: { Money: terms.pricePerItem },
        want: { Items: ticket1Amount },
      });

      const paymentKeywordRecord = harden({ Money: moolaPayment });

      const { payout: payoutP } = await E(zoe).offer(
        invite,
        proposal,
        paymentKeywordRecord,
      );
      const payout = await payoutP;
      const boughtTicketAmount = await E(ticketIssuer).getAmountOf(
        payout.Items,
      );
      log('boughtTicketAmount: ', boughtTicketAmount);
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
