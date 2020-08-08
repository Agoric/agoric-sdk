import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { showPurseBalance, setupIssuers } from '../helpers';
import { makeGetInstanceHandle } from '../../../src/clientSupport';

const build = async (log, zoe, issuers, payments, installations, timer) => {
  const {
    moola,
    simoleans,
    bucks,
    purses,
    moolaAmountMath,
    simoleanAmountMath,
  } = await setupIssuers(zoe, issuers);
  const [moolaPurseE, simoleanPurseE, bucksPurseE] = purses;
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  return harden({
    doAutomaticRefund: async inviteE => {
      const invite = await inviteE;
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
      const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
        exclInvite,
        bobProposal,
        bobPayments,
      );
      log(await outcomeE);

      const bobResult = await payoutE;
      const moolaPayout = await bobResult.Contribution1;
      const simoleanPayout = await bobResult.Contribution2;

      // 5: Bob deposits his winnings
      await E(moolaPurseE).deposit(moolaPayout);
      await E(simoleanPurseE).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
    },

    doCoveredCall: async inviteE => {
      // Bob claims all with the Zoe inviteIssuer
      const invite = await inviteE;
      const exclInvite = await E(inviteIssuer).claim(invite);

      const bobIntendedProposal = harden({
        want: { UnderlyingAsset: moola(3) },
        give: { StrikePrice: simoleans(7) },
      });

      // Bob checks that the invite is for the right covered call
      const { value: optionValue } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );
      assert(
        optionValue[0].installationHandle === installations.coveredCall,
        details`wrong installation`,
      );
      assert(
        optionValue[0].inviteDesc === 'exerciseOption',
        details`wrong invite`,
      );
      assert(moolaAmountMath.isEqual(optionValue[0].underlyingAsset, moola(3)));
      assert(
        simoleanAmountMath.isEqual(optionValue[0].strikePrice, simoleans(7)),
      );
      assert(
        optionValue[0].expirationDate === 1,
        details`wrong expirationDate`,
      );
      assert(optionValue[0].timerAuthority === timer, 'wrong timer');

      const {
        issuerKeywordRecord: { UnderlyingAsset, StrikePrice },
      } = await E(zoe).getInstanceRecord(optionValue[0].instanceHandle);

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
      const { payout: payoutE, outcome: bobOutcomeE } = await E(zoe).offer(
        exclInvite,
        bobIntendedProposal,
        bobPayments,
      );

      log(await bobOutcomeE);

      const bobResult = await payoutE;
      const moolaPayout = await bobResult.UnderlyingAsset;
      const simoleanPayout = await bobResult.StrikePrice;

      await E(moolaPurseE).deposit(moolaPayout);
      await E(simoleanPurseE).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
    },
    doSwapForOption: async (inviteE, daveE) => {
      // Bob claims all with the Zoe inviteIssuer
      const invite = await inviteE;
      const exclInvite = await E(inviteIssuer).claim(invite);

      // Bob checks that the invite is for the right covered call
      const optionAmounts = await E(inviteIssuer).getAmountOf(exclInvite);
      const optionValue = optionAmounts.value;

      assert(
        optionValue[0].installationHandle === installations.coveredCall,
        details`wrong installation`,
      );
      assert(
        optionValue[0].inviteDesc === 'exerciseOption',
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
      const {
        issuerKeywordRecord: { UnderlyingAsset, StrikePrice },
      } = await E(zoe).getInstanceRecord(optionValue[0].instanceHandle);
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
      const { payout: payoutE, outcome: daveSwapInviteE } = await E(zoe).offer(
        bobSwapInvite,
        bobProposalSwap,
        bobSwapPayments,
      );

      // Bob makes an offer to the swap with his "higher order"
      log('swap invite made');
      await E(daveE).doSwapForOption(daveSwapInviteE, optionAmounts);

      const bobResult = await payoutE;
      const bucksPayout = await bobResult.Price;

      // Bob deposits his winnings
      await E(bucksPurseE).deposit(bucksPayout);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
      await showPurseBalance(bucksPurseE, 'bobBucksPurse;', log);
    },
    doPublicAuction: async inviteE => {
      const invite = await inviteE;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, issuerKeywordRecord, terms } = await E(
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
        details`issuerKeywordRecord was not as expected`,
      );
      assert(terms.numBidsAllowed === 3, details`terms not as expected`);
      assert(sameStructure(inviteValue[0].minimumBid, simoleans(3)));
      assert(sameStructure(inviteValue[0].auctionedAssets, moola(1)));

      const proposal = harden({
        want: { Asset: moola(1) },
        give: { Bid: simoleans(11) },
      });
      const paymentKeywordRecord = { Bid: simoleanPayment };

      const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
        exclInvite,
        proposal,
        paymentKeywordRecord,
      );

      log(await outcomeE);

      const bobResult = await payoutE;
      const moolaPayout = await bobResult.Asset;
      const simoleanPayout = await bobResult.Bid;

      await E(moolaPurseE).deposit(moolaPayout);
      await E(simoleanPurseE).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
    },
    doAtomicSwap: async inviteE => {
      const invite = await inviteE;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteValue[0].instanceHandle);
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
        sameStructure(inviteValue[0].asset, moola(3)),
        details`Alice made a different offer than expected`,
      );
      assert(
        sameStructure(inviteValue[0].price, simoleans(7)),
        details`Alice made a different offer than expected`,
      );

      const proposal = harden({
        want: { Asset: moola(3) },
        give: { Price: simoleans(7) },
      });
      const paymentKeywordRecord = { Price: simoleanPayment };

      const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
        exclInvite,
        proposal,
        paymentKeywordRecord,
      );

      log(await outcomeE);

      const bobResult = await payoutE;
      const moolaPayout = await bobResult.Asset;
      const simoleanPayout = await bobResult.Price;

      await E(moolaPurseE).deposit(moolaPayout);
      await E(simoleanPurseE).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
    },
    doSimpleExchange: async inviteE => {
      const invite = await inviteE;
      const exclInvite = await E(inviteIssuer).claim(invite);
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(
        exclInvite,
      );

      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteValue[0].instanceHandle);
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

      const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
        exclInvite,
        bobBuyOrderProposal,
        paymentKeywordRecord,
      );

      log(await outcomeE);

      const bobResult = await payoutE;
      const moolaPayout = await bobResult.Asset;
      const simoleanPayout = await bobResult.Price;

      await E(moolaPurseE).deposit(moolaPayout);
      await E(simoleanPurseE).deposit(simoleanPayout);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
    },
    doSimpleExchangeUpdates: async (inviteE, m, s) => {
      const invite = await E(inviteIssuer).claim(inviteE);
      const { value: inviteValue } = await E(inviteIssuer).getAmountOf(invite);
      const { installationHandle, issuerKeywordRecord } = await E(
        zoe,
      ).getInstanceRecord(inviteValue[0].instanceHandle);
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
        await E(simoleanPurseE).deposit(simoleanPayment);
      }
      const simoleanPayment2 = await E(simoleanPurseE).withdraw(simoleans(s));
      const paymentKeywordRecord = { Price: simoleanPayment2 };
      const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
        invite,
        bobBuyOrderProposal,
        paymentKeywordRecord,
      );

      log(await outcomeE);

      payoutE.then(async bobResult => {
        E(moolaPurseE).deposit(await bobResult.Asset);
        E(simoleanPurseE).deposit(await bobResult.Price);
      });

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
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
        moola(3),
        simoleans(0).brand,
      );
      log(`simoleanAmounts `, simoleanAmounts);

      const buyBInvite = E(publicAPI).makeSwapInvite();

      const moolaForSimProposal = harden({
        give: { In: moola(3) },
        want: { Out: simoleans(1) },
      });

      const moolaForSimPayments = harden({ In: moolaPayment });
      const { payout: moolaForSimPayoutE, outcome: outcomeE } = await E(
        zoe,
      ).offer(buyBInvite, moolaForSimProposal, moolaForSimPayments);

      log(await outcomeE);
      const moolaForSimPayout = await moolaForSimPayoutE;
      const moolaPayout1 = await moolaForSimPayout.In;
      const simoleanPayout1 = await moolaForSimPayout.Out;

      await E(moolaPurseE).deposit(moolaPayout1);
      await E(simoleanPurseE).deposit(simoleanPayout1);

      // Bob looks up the price of 3 simoleans. It's 5 moola
      const moolaAmounts = await E(publicAPI).getCurrentPrice(
        simoleans(3),
        moola(0).brand,
      );
      log(`moolaAmounts `, moolaAmounts);

      // Bob makes another offer and swaps
      const bobSimsForMoolaProposal = harden({
        want: { Out: moola(5) },
        give: { In: simoleans(3) },
      });
      await E(simoleanPurseE).deposit(simoleanPayment);
      const bobSimoleanPayment = await E(simoleanPurseE).withdraw(simoleans(3));
      const simsForMoolaPayments = harden({ In: bobSimoleanPayment });
      const invite2 = E(publicAPI).makeSwapInvite();

      const {
        payout: bobSimsForMoolaPayoutE,
        outcome: simsForMoolaOutcomeE,
      } = await E(zoe).offer(
        invite2,
        bobSimsForMoolaProposal,
        simsForMoolaPayments,
      );

      log(await simsForMoolaOutcomeE);

      const simsForMoolaPayout = await bobSimsForMoolaPayoutE;
      const moolaPayout2 = await simsForMoolaPayout.Out;
      const simoleanPayout2 = await simsForMoolaPayout.In;

      await E(moolaPurseE).deposit(moolaPayout2);
      await E(simoleanPurseE).deposit(simoleanPayout2);

      await showPurseBalance(moolaPurseE, 'bobMoolaPurse', log);
      await showPurseBalance(simoleanPurseE, 'bobSimoleanPurse', log);
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

      // find the value corresponding to ticket #1
      const ticket1Value = availableTickets.value.find(
        ticket => ticket.number === 1,
      );
      // make the corresponding amount
      const ticket1Amount = await E(ticketAmountMath).make(
        harden([ticket1Value]),
      );

      const proposal = harden({
        give: { Money: terms.pricePerItem },
        want: { Items: ticket1Amount },
      });

      const paymentKeywordRecord = harden({ Money: moolaPayment });

      const { payout: payoutE } = await E(zoe).offer(
        invite,
        proposal,
        paymentKeywordRecord,
      );
      const payout = await payoutE;
      const boughtTicketAmount = await E(ticketIssuer).getAmountOf(
        payout.Items,
      );
      log('boughtTicketAmount: ', boughtTicketAmount);
    },
  });
};

export function buildRootObject(vatPowers) {
  return harden({
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
