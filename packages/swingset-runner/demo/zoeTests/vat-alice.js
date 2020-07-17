/* global harden */

import { E } from '@agoric/eventual-send';
import { showPurseBalance, setupIssuers, getLocalAmountMath } from './helpers';
import { makePrintLog } from './printLog';

const log = makePrintLog();

const build = async (zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;

  const doAutomaticRefund = async bobP => {
    log(`=> alice.doCreateAutomaticRefund called`);
    const installId = installations.automaticRefund;
    const issuerKeywordRecord = harden({
      Contribution1: moolaIssuer,
      Contribution2: simoleanIssuer,
    });
    const { invite: refundInvite, instanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );

    const { publicAPI } = instanceRecord;
    const proposal = harden({
      give: { Contribution1: moola(3) },
      want: { Contribution2: simoleans(7) },
      exit: { onDemand: null },
    });

    const paymentKeywordRecord = { Contribution1: moolaPayment };
    const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
      refundInvite,
      proposal,
      paymentKeywordRecord,
    );
    log(await outcomeP);

    const bobInvite = E(publicAPI).makeInvite();
    await E(bobP).doAutomaticRefund(bobInvite);
    const payout = await payoutP;
    const moolaPayout = await payout.Contribution1;
    const simoleanPayout = await payout.Contribution2;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doCoveredCall = async bobP => {
    log(`=> alice.doCreateCoveredCall called`);
    const installId = installations.coveredCall;
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const { invite: writeCallInvite } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );

    const proposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: { afterDeadline: { deadline: 1, timer } },
    });

    const paymentKeywordRecord = { UnderlyingAsset: moolaPayment };
    const { payout: payoutP, outcome: optionP } = await E(zoe).offer(
      writeCallInvite,
      proposal,
      paymentKeywordRecord,
    );

    await E(bobP).doCoveredCall(optionP);
    const payout = await payoutP;
    const moolaPayout = await payout.UnderlyingAsset;
    const simoleanPayout = await payout.StrikePrice;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doSwapForOption = async (bobP, _carolP, daveP) => {
    log(`=> alice.doSwapForOption called`);
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const { invite: writeCallInvite } = await E(zoe).makeInstance(
      installations.coveredCall,
      issuerKeywordRecord,
    );

    const proposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 100,
          timer,
        },
      },
    });

    const paymentKeywordRecord = harden({ UnderlyingAsset: moolaPayment });
    const { payout: payoutP, outcome: optionP } = await E(zoe).offer(
      writeCallInvite,
      proposal,
      paymentKeywordRecord,
    );

    log('call option made');
    await E(bobP).doSwapForOption(optionP, daveP);
    const payout = await payoutP;
    const moolaPayout = await payout.UnderlyingAsset;
    const simoleanPayout = await payout.StrikePrice;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doPublicAuction = async (bobP, carolP, daveP) => {
    const numBidsAllowed = 3;
    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Ask: simoleanIssuer,
    });
    const terms = harden({ numBidsAllowed });
    const {
      invite: sellAssetsInvite,
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(
      installations.publicAuction,
      issuerKeywordRecord,
      terms,
    );

    const proposal = harden({
      give: { Asset: moola(1) },
      want: { Ask: simoleans(3) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
      sellAssetsInvite,
      proposal,
      paymentKeywordRecord,
    );

    const [bobInvite, carolInvite, daveInvite] = await E(publicAPI).makeInvites(
      3,
    );

    log(await outcomeP);

    const bobDoneP = E(bobP).doPublicAuction(bobInvite);
    const carolDoneP = E(carolP).doPublicAuction(carolInvite);
    const daveDoneP = E(daveP).doPublicAuction(daveInvite);

    await Promise.all([bobDoneP, carolDoneP, daveDoneP]);

    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Ask;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doAtomicSwap = async bobP => {
    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { invite: firstOfferInvite } = await E(zoe).makeInstance(
      installations.atomicSwap,
      issuerKeywordRecord,
    );

    const proposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { payout: payoutP, outcome: bobInviteP } = await E(zoe).offer(
      firstOfferInvite,
      proposal,
      paymentKeywordRecord,
    );

    E(bobP).doAtomicSwap(bobInviteP);

    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doSimpleExchange = async bobP => {
    const issuerKeywordRecord = harden({
      Price: simoleanIssuer,
      Asset: moolaIssuer,
    });
    const { simpleExchange } = installations;
    const {
      invite: addOrderInvite,
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(simpleExchange, issuerKeywordRecord);

    const aliceSellOrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
      addOrderInvite,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    log(await outcomeP);

    const bobInviteP = E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchange(bobInviteP);

    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  function logStateOnChanges(notifier, lastHandle = undefined) {
    const updateRecordP = E(notifier).getUpdateSince(lastHandle);
    updateRecordP.then(updateRec => {
      log(updateRec.value);
      logStateOnChanges(notifier, updateRec.updateHandle);
    });
  }

  const doSimpleExchangeWithNotification = async bobP => {
    const issuerKeywordRecord = harden({
      Price: simoleanIssuer,
      Asset: moolaIssuer,
    });
    const { simpleExchange } = installations;
    const {
      invite: addOrderInvite,
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(simpleExchange, issuerKeywordRecord);

    logStateOnChanges(await E(publicAPI).getNotifier());

    const aliceSellOrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { payout: payoutP, outcome: outcomeP } = await E(zoe).offer(
      addOrderInvite,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    log(await outcomeP);

    const bobInvite1P = E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite1P, 3, 7);
    const bobInvite2P = E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite2P, 8, 2);

    const payout = await payoutP;

    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;
    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
    const bobInvite3P = E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite3P, 20, 13);
    const bobInvite4P = E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite4P, 5, 2);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doAutoswap = async bobP => {
    const issuerKeywordRecord = harden({
      TokenA: moolaIssuer,
      TokenB: simoleanIssuer,
    });
    const {
      invite: addLiquidityInvite,
      instanceRecord: { publicAPI, handle: instanceHandle },
    } = await E(zoe).makeInstance(installations.autoswap, issuerKeywordRecord);
    const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();
    const liquidityAmountMath = await getLocalAmountMath(liquidityIssuer);
    const liquidity = liquidityAmountMath.make;

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const addLiquidityProposal = harden({
      give: { TokenA: moola(10), TokenB: simoleans(5) },
      want: { Liquidity: liquidity(10) },
    });
    const paymentKeywordRecord = harden({
      TokenA: moolaPayment,
      TokenB: simoleanPayment,
    });
    const { payout: payoutP, outcome: addLiquidityOutcomeP } = await E(
      zoe,
    ).offer(addLiquidityInvite, addLiquidityProposal, paymentKeywordRecord);

    log(await addLiquidityOutcomeP);

    const addLiquidityPayments = await payoutP;
    const liquidityPayout = await addLiquidityPayments.Liquidity;

    const liquidityTokenPurseP = E(liquidityIssuer).makeEmptyPurse();
    await E(liquidityTokenPurseP).deposit(liquidityPayout);

    await E(bobP).doAutoswap(instanceHandle);

    // remove the liquidity
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: liquidity(10) },
      want: { TokenA: moola(0), TokenB: simoleans(0) },
    });

    const liquidityTokenPayment = await E(liquidityTokenPurseP).withdraw(
      liquidity(10),
    );
    const removeLiquidityInvite = E(publicAPI).makeRemoveLiquidityInvite();

    const {
      payout: aliceRemoveLiquidityPayoutP,
      outcome: removeLiquidityOutcomeP,
    } = await E(zoe).offer(
      removeLiquidityInvite,
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityTokenPayment }),
    );

    log(await removeLiquidityOutcomeP);

    const payout = await aliceRemoveLiquidityPayoutP;
    const moolaPayout = await payout.TokenA;
    const simoleanPayout = await payout.TokenB;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    const poolAmounts = await E(publicAPI).getPoolAllocation();

    log(`poolAmounts`, poolAmounts);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    await showPurseBalance(
      liquidityTokenPurseP,
      'aliceLiquidityTokenPurse',
      log,
    );
  };

  const doSellTickets = async bobP => {
    const { mintAndSellNFT } = installations;
    const { invite } = await E(zoe).makeInstance(mintAndSellNFT);

    const { outcome } = await E(zoe).offer(invite);
    const ticketSeller = await outcome;

    // completeObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
    const {
      sellItemsInstanceHandle: ticketSalesInstanceHandle,
      payout: payoutP,
      completeObj,
    } = await E(ticketSeller).sellTokens({
      customValueProperties: {
        show: 'Steven Universe, the Opera',
        start: 'Wed, March 25th 2020 at 8pm',
      },
      count: 3,
      moneyIssuer: moolaIssuer,
      sellItemsInstallationHandle: installations.sellItems,
      pricePerItem: moola(22),
    });

    await E(bobP).doBuyTickets(ticketSalesInstanceHandle);

    const { publicAPI: ticketSalesPublicAPI } = await E(zoe).getInstanceRecord(
      ticketSalesInstanceHandle,
    );
    const availableTickets = await E(ticketSalesPublicAPI).getAvailableItems();

    log('after ticket1 purchased: ', availableTickets);

    await E(completeObj).complete();

    const payout = await payoutP;
    const moneyPayment = await payout.Money;
    await E(moolaPurseP).deposit(moneyPayment);
    const currentPurseBalance = await E(moolaPurseP).getCurrentAmount();

    log('alice earned: ', currentPurseBalance);
  };

  return harden({
    startTest: async (testName, bobP, carolP, daveP) => {
      switch (testName) {
        case 'automaticRefundOk': {
          return doAutomaticRefund(bobP, carolP, daveP);
        }
        case 'coveredCallOk': {
          return doCoveredCall(bobP, carolP, daveP);
        }
        case 'swapForOptionOk': {
          return doSwapForOption(bobP, carolP, daveP);
        }
        case 'publicAuctionOk': {
          return doPublicAuction(bobP, carolP, daveP);
        }
        case 'atomicSwapOk': {
          return doAtomicSwap(bobP, carolP, daveP);
        }
        case 'simpleExchangeOk': {
          return doSimpleExchange(bobP, carolP, daveP);
        }
        case 'simpleExchangeNotifier': {
          return doSimpleExchangeWithNotification(bobP, carolP, daveP);
        }
        case 'autoswapOk': {
          return doAutoswap(bobP, carolP, daveP);
        }
        case 'sellTicketsOk': {
          return doSellTickets(bobP, carolP, daveP);
        }
        default: {
          throw new Error(`testName ${testName} not recognized`);
        }
      }
    },
  });
};

export function buildRootObject(_vatPowers) {
  return harden({ build });
}
