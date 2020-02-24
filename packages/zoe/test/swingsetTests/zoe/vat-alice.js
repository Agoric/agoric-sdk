import harden from '@agoric/harden';
import { showPaymentBalance, setupAssays, getLocalUnitOps } from './helpers';

const build = async (E, log, zoe, purses, installations, timer) => {
  const { assays, moola, simoleans } = await setupAssays(zoe, purses);
  const [moolaPurseP, simoleanPurseP] = purses;

  const doAutomaticRefund = async bobP => {
    log(`=> alice.doCreateAutomaticRefund called`);
    const installId = installations.automaticRefund;
    const invite = await E(zoe).makeInstance(installId, { assays });
    const {
      extent: { instanceHandle },
    } = await E(invite).getBalance();
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const offerRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const aliceMoolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [aliceMoolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const outcome = await E(seat).makeOffer();
    log(outcome);

    const bobInvite = E(publicAPI).makeInvite();
    await E(bobP).doAutomaticRefund(bobInvite);
    const payout = await payoutP;

    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  const doCoveredCall = async bobP => {
    log(`=> alice.doCreateCoveredCall called`);
    const installId = installations.coveredCall;
    const invite = await E(zoe).makeInstance(installId, { assays });

    const offerRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 1,
        timer,
      },
    });

    const aliceMoolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [aliceMoolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const option = await E(seat).makeCallOption();
    await E(bobP).doCoveredCall(option);
    const payout = await payoutP;

    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  const doSwapForOption = async (bobP, _carolP, daveP) => {
    log(`=> alice.doSwapForOption called`);
    const invite = await E(zoe).makeInstance(installations.coveredCall, {
      assays,
    });

    const offerRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 100,
        timer,
      },
    });

    const aliceMoolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [aliceMoolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const option = await E(seat).makeCallOption();
    log('call option made');
    await E(bobP).doSwapForOption(option, daveP);
    const payout = await payoutP;

    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  const doPublicAuction = async (bobP, carolP, daveP) => {
    const numBidsAllowed = 3;
    const invite = await E(zoe).makeInstance(installations.publicAuction, {
      assays,
      numBidsAllowed,
    });
    const {
      extent: { instanceHandle },
    } = await E(invite).getBalance();
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const offerRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(1),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(3),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const offerResult = await E(seat).sellAssets();
    const [bobInvite, carolInvite, daveInvite] = await E(publicAPI).makeInvites(
      3,
    );

    log(offerResult);

    const bobDoneP = E(bobP).doPublicAuction(bobInvite);
    const carolDoneP = E(carolP).doPublicAuction(carolInvite);
    const daveDoneP = E(daveP).doPublicAuction(daveInvite);

    await Promise.all([bobDoneP, carolDoneP, daveDoneP]);

    const payout = await payoutP;

    // Alice deposits her winnings to ensure she can
    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  const doAtomicSwap = async bobP => {
    const invite = await E(zoe).makeInstance(installations.atomicSwap, {
      assays,
    });

    const offerRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const bobInviteP = await E(seat).makeFirstOffer();
    E(bobP).doAtomicSwap(bobInviteP);

    const payout = await payoutP;
    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  const doSimpleExchange = async bobP => {
    const { invite } = await E(zoe).makeInstance(installations.simpleExchange, {
      assays,
    });
    const {
      extent: { instanceHandle },
    } = await E(invite).getBalance();
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(4),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      aliceSellOrderOfferRules,
      offerPayments,
    );

    const offerResult = await E(seat).addOrder();

    log(offerResult);

    const { invite: bobInviteP } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchange(bobInviteP);

    const payout = await payoutP;

    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  function printOrders(orders) {
    if (orders.length === 0) {
      return '[]';
    }
    const descs = [];
    for (const o of orders) {
      descs.push(
        `${o.offer.label.allegedName}:${o.offer.extent} for ${o.want.label.allegedName}:${o.want.extent}`,
      );
    }
    return descs;
  }

  function pollForBookOrders(publicAPI) {
    const orderResultP = E(publicAPI).getBookOrders();
    orderResultP.then(orderResult => {
      const { changed: p, buys, sells } = orderResult;
      p.then(() => {
        pollForBookOrders(publicAPI);
        log(`Order update: b:${printOrders(buys)}, s:${printOrders(sells)}`);
      });
    });
  }

  const doSimpleExchangeUpdates = async bobP => {
    const { invite } = await E(zoe).makeInstance(installations.simpleExchange, {
      assays,
    });
    const {
      extent: { instanceHandle },
    } = await E(invite).getBalance();
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    pollForBookOrders(publicAPI);
    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(4),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      aliceSellOrderOfferRules,
      offerPayments,
    );

    const offerResult = await E(seat).addOrder();

    log(offerResult);

    const { invite: bobInvite1P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite1P, 3, 7);
    const { invite: bobInvite2P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite2P, 8, 2);

    const payout = await payoutP;

    await E(moolaPurseP).depositAll(payout[0]);
    await E(simoleanPurseP).depositAll(payout[1]);

    const { invite: bobInvite3P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite3P, 20, 13);
    const { invite: bobInvite4P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite4P, 5, 2);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;', log);
  };

  const doAutoswap = async bobP => {
    const invite = await E(zoe).makeInstance(installations.autoswap, {
      assays,
    });
    const {
      extent: { instanceHandle },
    } = await E(invite).getBalance();
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);
    const liquidityAssay = await E(publicAPI).getLiquidityAssay();
    const liquidityUnitOps = await getLocalUnitOps(liquidityAssay);
    const liquidity = liquidityUnitOps.make;

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const addLiquidityOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(10),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(5),
        },
        {
          kind: 'wantAtLeast',
          units: liquidity(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const moolaPaymentP = E(moolaPurseP).withdrawAll();
    const simoleanPaymentP = E(simoleanPurseP).withdrawAll();
    const offerPayments = [moolaPaymentP, simoleanPaymentP, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      addLiquidityOfferRules,
      offerPayments,
    );

    const addLiquidityOutcome = await E(seat).addLiquidity();

    log(addLiquidityOutcome);

    const addLiquidityPayments = await payoutP;

    const liquidityTokenPurseP = E(liquidityAssay).makeEmptyPurse();
    await E(liquidityTokenPurseP).depositAll(addLiquidityPayments[2]);

    const bobInviteP = E(publicAPI).makeInvite();
    await E(bobP).doAutoswap(bobInviteP);

    // remove the liquidity
    const aliceRemoveLiquidityPayoutRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(0),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(0),
        },
        {
          kind: 'offerAtMost',
          units: liquidity(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const liquidityTokenPayment = await E(liquidityTokenPurseP).withdrawAll();
    const removeLiquidityInvite = await E(publicAPI).makeInvite();

    const {
      seat: removeLiquiditySeat,
      payout: aliceRemoveLiquidityPayoutP,
    } = await E(zoe).redeem(
      removeLiquidityInvite,
      aliceRemoveLiquidityPayoutRules,
      harden([undefined, undefined, liquidityTokenPayment]),
    );

    const removeLiquidityOutcome = await E(
      removeLiquiditySeat,
    ).removeLiquidity();
    log(removeLiquidityOutcome);

    const removeLiquidityPayouts = await aliceRemoveLiquidityPayoutP;
    await E(moolaPurseP).depositAll(removeLiquidityPayouts[0]);
    await E(simoleanPurseP).depositAll(removeLiquidityPayouts[1]);

    log(await E(publicAPI).getPoolUnits());

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    await showPaymentBalance(
      liquidityTokenPurseP,
      'aliceLiquidityTokenPurse',
      log,
    );
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
        case 'simpleExchangeUpdates': {
          return doSimpleExchangeUpdates(bobP, carolP, daveP);
        }
        case 'autoswapOk': {
          return doAutoswap(bobP, carolP, daveP);
        }
        default: {
          throw new Error(`testName ${testName} not recognized`);
        }
      }
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
