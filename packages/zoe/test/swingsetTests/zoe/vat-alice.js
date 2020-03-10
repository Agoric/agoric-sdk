import harden from '@agoric/harden';
import { showPurseBalance, setupIssuers, getLocalAmountMath } from './helpers';

const build = async (E, log, zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();

  const doAutomaticRefund = async bobP => {
    log(`=> alice.doCreateAutomaticRefund called`);
    const installId = installations.automaticRefund;
    const roles = harden({
      Contribution1: moolaIssuer,
      Contribution2: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(installId, roles);
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);

    const instanceRecord = await E(zoe).getInstance(instanceHandle);
    const { publicAPI } = instanceRecord;
    const offerRules = harden({
      offer: { Contribution1: moola(3) },
      want: { Contribution2: simoleans(7) },
      exit: { onDemand: {} },
    });

    const offerPayments = { Contribution1: moolaPayment };
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
    const roles = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(installId, roles);

    const offerRules = harden({
      offer: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: { afterDeadline: { deadline: 1, timer } },
    });

    const offerPayments = { UnderlyingAsset: moolaPayment };
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const option = await E(seat).makeCallOption();
    await E(bobP).doCoveredCall(option);
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
    const invite = await E(zoe).makeInstance(installations.coveredCall, {
      issuers: [moolaIssuer, simoleanIssuer],
    });

    const offerRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 100,
        timer,
      },
    });

    const offerPayments = [moolaPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const option = await E(seat).makeCallOption();
    log('call option made');
    await E(bobP).doSwapForOption(option, daveP);
    const payout = await payoutP;
    const [moolaPayout, simoleanPayout] = await Promise.all(payout);

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doPublicAuction = async (bobP, carolP, daveP) => {
    const numBidsAllowed = 3;
    const invite = await E(zoe).makeInstance(
      installations.publicAuction,
      harden({
        roles: { Asset: moolaIssuer, Bid: simoleanIssuer },
        numBidsAllowed,
      }),
    );
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const offerRules = harden({
      offer: { Asset: moola(1) },
      want: { Bid: simoleans(3) },
      exitRule: { kind: 'onDemand' },
    });
    const offerPayments = { Asset: moolaPayment };
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
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Bid;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doAtomicSwap = async bobP => {
    const roles = harden({ Asset: moolaIssuer, Price: simoleanIssuer });
    const invite = await E(zoe).makeInstance(installations.atomicSwap, roles);

    const offerRules = harden({
      offer: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exitRule: { kind: 'onDemand' },
    });
    const offerPayments = { Asset: moolaPayment };
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      offerRules,
      offerPayments,
    );

    const bobInviteP = await E(seat).makeFirstOffer();
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
    const { invite } = await E(zoe).makeInstance(installations.simpleExchange, {
      roles: { Asset: moolaIssuer, Price: simoleanIssuer },
    });
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const aliceSellOrderOfferRules = harden({
      offer: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exitRule: { kind: 'onDemand' },
    });
    const offerPayments = { Asset: moolaPayment };
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
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  function printOrders(orders, brandPetnames, brands, offerIndex = 0) {
    if (orders.length === 0) {
      return '[]';
    }
    const wantIndex = 1 - offerIndex;
    const descs = [];
    for (const o of orders) {
      const offerBrandPetname =
        brandPetnames[brands.indexOf(o[offerIndex].offer.brand)];
      const wantBrandPetname =
        brandPetnames[brands.indexOf(o[wantIndex].want.brand)];
      descs.push(
        `${offerBrandPetname}:${o[offerIndex].offer.extent} for ${wantBrandPetname}:${o[wantIndex].want.extent}`,
      );
    }
    return descs;
  }

  function pollForBookOrders(publicAPI, petnames, brands) {
    const orderResultP = E(publicAPI).getBookOrders();

    orderResultP.then(orderResult => {
      const { changed: p, buys, sells } = orderResult;
      p.then(() => {
        pollForBookOrders(publicAPI, petnames, brands);
        log(
          `Order update: b:${printOrders(
            buys,
            petnames,
            brands,
            1,
          )}, s:${printOrders(sells, petnames, brands, 0)}`,
        );
      });
    });
  }

  const doSimpleExchangeUpdates = async bobP => {
    const { invite } = await E(zoe).makeInstance(installations.simpleExchange, {
      issuers: [moolaIssuer, simoleanIssuer],
    });
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const petnames = ['moola', 'simoleans'];
    const brands = await Promise.all([
      E(moolaIssuer).getBrand(),
      E(simoleanIssuer).getBrand(),
    ]);

    pollForBookOrders(publicAPI, petnames, brands);
    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(4),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
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

    await E(moolaPurseP).deposit(await payout[0]);
    await E(simoleanPurseP).deposit(await payout[1]);

    const { invite: bobInvite3P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite3P, 20, 13);
    const { invite: bobInvite4P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite4P, 5, 2);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doAutoswap = async bobP => {
    const invite = await E(zoe).makeInstance(installations.autoswap, {
      issuers: [moolaIssuer, simoleanIssuer],
    });
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);
    const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();
    const liquidityAmountMath = await getLocalAmountMath(liquidityIssuer);
    const liquidity = liquidityAmountMath.make;

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const addLiquidityOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(10),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(5),
        },
        {
          kind: 'wantAtLeast',
          amount: liquidity(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const offerPayments = [moolaPayment, simoleanPayment, undefined];
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      addLiquidityOfferRules,
      offerPayments,
    );

    const addLiquidityOutcome = await E(seat).addLiquidity();

    log(addLiquidityOutcome);

    const addLiquidityPayments = await payoutP;
    const liquidityPayout = await addLiquidityPayments[2];

    const liquidityTokenPurseP = E(liquidityIssuer).makeEmptyPurse();
    await E(liquidityTokenPurseP).deposit(liquidityPayout);

    const bobInviteP = E(publicAPI).makeInvite();
    await E(bobP).doAutoswap(bobInviteP);

    // remove the liquidity
    const aliceRemoveLiquidityPayoutRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(0),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(0),
        },
        {
          kind: 'offerAtMost',
          amount: liquidity(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const liquidityTokenPayment = await E(liquidityTokenPurseP).withdraw(
      liquidity(10),
    );
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

    const payout = await aliceRemoveLiquidityPayoutP;
    const [moolaPayout, simoleanPayout] = await Promise.all(payout);

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    const poolAmounts = await E(publicAPI).getPoolAmounts();

    log(`poolAmounts`, poolAmounts);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    await showPurseBalance(
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
