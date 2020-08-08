/* global harden */

import { E } from '@agoric/eventual-send';
import { showPurseBalance, setupIssuers, getLocalAmountMath } from './helpers';
import { makePrintLog } from './printLog';

const log = makePrintLog();

const build = async (zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseE, simoleanPurseE] = purses;
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;

  const doAutomaticRefund = async bobE => {
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
    const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
      refundInvite,
      proposal,
      paymentKeywordRecord,
    );
    log(await outcomeE);

    const bobInvite = E(publicAPI).makeInvite();
    await E(bobE).doAutomaticRefund(bobInvite);
    const payout = await payoutE;
    const moolaPayout = await payout.Contribution1;
    const simoleanPayout = await payout.Contribution2;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  const doCoveredCall = async bobE => {
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
    const { payout: payoutE, outcome: optionE } = await E(zoe).offer(
      writeCallInvite,
      proposal,
      paymentKeywordRecord,
    );

    await E(bobE).doCoveredCall(optionE);
    const payout = await payoutE;
    const moolaPayout = await payout.UnderlyingAsset;
    const simoleanPayout = await payout.StrikePrice;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  const doSwapForOption = async (bobE, _carolE, daveE) => {
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
    const { payout: payoutE, outcome: optionE } = await E(zoe).offer(
      writeCallInvite,
      proposal,
      paymentKeywordRecord,
    );

    log('call option made');
    await E(bobE).doSwapForOption(optionE, daveE);
    const payout = await payoutE;
    const moolaPayout = await payout.UnderlyingAsset;
    const simoleanPayout = await payout.StrikePrice;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  const doPublicAuction = async (bobE, carolE, daveE) => {
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
    const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
      sellAssetsInvite,
      proposal,
      paymentKeywordRecord,
    );

    const [bobInvite, carolInvite, daveInvite] = await E(publicAPI).makeInvites(
      3,
    );

    log(await outcomeE);

    const bobDoneE = E(bobE).doPublicAuction(bobInvite);
    const carolDoneE = E(carolE).doPublicAuction(carolInvite);
    const daveDoneE = E(daveE).doPublicAuction(daveInvite);

    await Promise.all([bobDoneE, carolDoneE, daveDoneE]);

    const payout = await payoutE;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Ask;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  const doAtomicSwap = async bobE => {
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
    const { payout: payoutE, outcome: bobInviteE } = await E(zoe).offer(
      firstOfferInvite,
      proposal,
      paymentKeywordRecord,
    );

    E(bobE).doAtomicSwap(bobInviteE);

    const payout = await payoutE;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  const doSimpleExchange = async bobE => {
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
    const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
      addOrderInvite,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    log(await outcomeE);

    const bobInviteE = E(publicAPI).makeInvite();
    await E(bobE).doSimpleExchange(bobInviteE);

    const payout = await payoutE;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  function logStateOnChanges(notifier, lastCount = undefined) {
    const updateRecordE = E(notifier).getUpdateSince(lastCount);
    updateRecordE.then(updateRec => {
      log(updateRec.value);
      logStateOnChanges(notifier, updateRec.updateCount);
    });
  }

  const doSimpleExchangeWithNotification = async bobE => {
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
    const { payout: payoutE, outcome: outcomeE } = await E(zoe).offer(
      addOrderInvite,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    log(await outcomeE);

    const bobInvite1P = E(publicAPI).makeInvite();
    await E(bobE).doSimpleExchangeUpdates(bobInvite1P, 3, 7);
    const bobInvite2P = E(publicAPI).makeInvite();
    await E(bobE).doSimpleExchangeUpdates(bobInvite2P, 8, 2);

    const payout = await payoutE;

    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;
    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);
    const bobInvite3P = E(publicAPI).makeInvite();
    await E(bobE).doSimpleExchangeUpdates(bobInvite3P, 20, 13);
    const bobInvite4P = E(publicAPI).makeInvite();
    await E(bobE).doSimpleExchangeUpdates(bobInvite4P, 5, 2);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
  };

  const doAutoswap = async bobE => {
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
    const { payout: payoutE, outcome: addLiquidityOutcomeE } = await E(
      zoe,
    ).offer(addLiquidityInvite, addLiquidityProposal, paymentKeywordRecord);

    log(await addLiquidityOutcomeE);

    const addLiquidityPayments = await payoutE;
    const liquidityPayout = await addLiquidityPayments.Liquidity;

    const liquidityTokenPurseE = E(liquidityIssuer).makeEmptyPurse();
    await E(liquidityTokenPurseE).deposit(liquidityPayout);

    await E(bobE).doAutoswap(instanceHandle);

    // remove the liquidity
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: liquidity(10) },
      want: { TokenA: moola(0), TokenB: simoleans(0) },
    });

    const liquidityTokenPayment = await E(liquidityTokenPurseE).withdraw(
      liquidity(10),
    );
    const removeLiquidityInvite = E(publicAPI).makeRemoveLiquidityInvite();

    const {
      payout: aliceRemoveLiquidityPayoutE,
      outcome: removeLiquidityOutcomeE,
    } = await E(zoe).offer(
      removeLiquidityInvite,
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityTokenPayment }),
    );

    log(await removeLiquidityOutcomeE);

    const payout = await aliceRemoveLiquidityPayoutE;
    const moolaPayout = await payout.TokenA;
    const simoleanPayout = await payout.TokenB;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);

    const poolAmounts = await E(publicAPI).getPoolAllocation();

    log(`poolAmounts`, poolAmounts);

    await showPurseBalance(moolaPurseE, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseE, 'aliceSimoleanPurse', log);
    await showPurseBalance(
      liquidityTokenPurseE,
      'aliceLiquidityTokenPurse',
      log,
    );
  };

  const doSellTickets = async bobE => {
    const { mintAndSellNFT } = installations;
    const { invite } = await E(zoe).makeInstance(mintAndSellNFT);

    const { outcome } = await E(zoe).offer(invite);
    const ticketSeller = await outcome;

    // completeObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
    const {
      sellItemsInstanceHandle: ticketSalesInstanceHandle,
      payout: payoutE,
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

    await E(bobE).doBuyTickets(ticketSalesInstanceHandle);

    const { publicAPI: ticketSalesPublicAPI } = await E(zoe).getInstanceRecord(
      ticketSalesInstanceHandle,
    );
    const availableTickets = await E(ticketSalesPublicAPI).getAvailableItems();

    log('after ticket1 purchased: ', availableTickets);

    await E(completeObj).complete();

    const payout = await payoutE;
    const moneyPayment = await payout.Money;
    await E(moolaPurseE).deposit(moneyPayment);
    const currentPurseBalance = await E(moolaPurseE).getCurrentAmount();

    log('alice earned: ', currentPurseBalance);
  };

  return harden({
    startTest: async (testName, bobE, carolE, daveE) => {
      switch (testName) {
        case 'automaticRefundOk': {
          return doAutomaticRefund(bobE, carolE, daveE);
        }
        case 'coveredCallOk': {
          return doCoveredCall(bobE, carolE, daveE);
        }
        case 'swapForOptionOk': {
          return doSwapForOption(bobE, carolE, daveE);
        }
        case 'publicAuctionOk': {
          return doPublicAuction(bobE, carolE, daveE);
        }
        case 'atomicSwapOk': {
          return doAtomicSwap(bobE, carolE, daveE);
        }
        case 'simpleExchangeOk': {
          return doSimpleExchange(bobE, carolE, daveE);
        }
        case 'simpleExchangeNotifier': {
          return doSimpleExchangeWithNotification(bobE, carolE, daveE);
        }
        case 'autoswapOk': {
          return doAutoswap(bobE, carolE, daveE);
        }
        case 'sellTicketsOk': {
          return doSellTickets(bobE, carolE, daveE);
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
