import harden from '@agoric/harden';
import { showPurseBalance, setupIssuers, getLocalAmountMath } from '../helpers';

const build = async (E, log, zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [moolaPayment, simoleanPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();

  const doAutomaticRefund = async bobP => {
    log(`=> alice.doCreateAutomaticRefund called`);
    const installId = installations.automaticRefund;
    const issuerKeywordRecord = harden({
      Contribution1: moolaIssuer,
      Contribution2: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(installId, issuerKeywordRecord);
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);

    const instanceRecord = await E(zoe).getInstance(instanceHandle);
    const { publicAPI } = instanceRecord;
    const proposal = harden({
      give: { Contribution1: moola(3) },
      want: { Contribution2: simoleans(7) },
      exit: { onDemand: null },
    });

    const paymentKeywordRecord = { Contribution1: moolaPayment };
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      proposal,
      paymentKeywordRecord,
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
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(installId, issuerKeywordRecord);

    const proposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: { afterDeadline: { deadline: 1, timer } },
    });

    const paymentKeywordRecord = { UnderlyingAsset: moolaPayment };
    const { payout: payoutP, outcome: option } = await E(zoe).offer(
      invite,
      proposal,
      paymentKeywordRecord,
    );

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
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(
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
    const { payout: payoutP, outcome: option } = await E(zoe).offer(
      invite,
      proposal,
      paymentKeywordRecord,
    );

    log('call option made');
    await E(bobP).doSwapForOption(option, daveP);
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
      Bid: simoleanIssuer,
    });
    const terms = harden({ numBidsAllowed });
    const invite = await E(zoe).makeInstance(
      installations.publicAuction,
      issuerKeywordRecord,
      terms,
    );
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const proposal = harden({
      give: { Asset: moola(1) },
      want: { Bid: simoleans(3) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      proposal,
      paymentKeywordRecord,
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
    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(
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
      invite,
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
    const { invite } = await E(zoe).makeInstance(
      simpleExchange,
      issuerKeywordRecord,
    );
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const aliceSellOrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      aliceSellOrderProposal,
      paymentKeywordRecord,
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

  function printOrders(orders, brandPetnames, brands, giveIndex = 0) {
    if (orders.length === 0) {
      return '[]';
    }
    const wantIndex = 1 - giveIndex;
    const keywords = ['Price', 'Asset'];
    const descs = [];
    for (const o of orders) {
      const giveKeyword = Object.getOwnPropertyNames(o[giveIndex])[0];
      const wantKeyword = Object.getOwnPropertyNames(o[wantIndex])[0];
      const giveBrandPetname = brandPetnames[keywords.indexOf(giveKeyword)];
      const wantBrandPetname = brandPetnames[keywords.indexOf(wantKeyword)];
      descs.push(
        `${giveBrandPetname}:${o[giveIndex][giveKeyword]} for ${wantBrandPetname}:${o[wantIndex][wantKeyword]}`,
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
        const buyOrders = printOrders(buys, petnames, brands, 1);
        const sellOrders = printOrders(sells, petnames, brands, 0);
        log(`Order update: b:${buyOrders}, s:${sellOrders}`);
      });
    });
  }

  const doSimpleExchangeUpdates = async bobP => {
    const issuerKeywordRecord = harden({
      Price: simoleanIssuer,
      Asset: moolaIssuer,
    });
    const { simpleExchange } = installations;
    const { invite } = await E(zoe).makeInstance(
      simpleExchange,
      issuerKeywordRecord,
    );
    const {
      extent: [{ instanceHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const { publicAPI } = await E(zoe).getInstance(instanceHandle);

    const petnames = ['simoleans', 'moola'];
    const brands = await Promise.all([
      E(simoleanIssuer).getBrand(),
      E(moolaIssuer).getBrand(),
    ]);

    pollForBookOrders(publicAPI, petnames, brands);
    const aliceSellOrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    const offerResult = await E(seat).addOrder();

    log(offerResult);

    const { invite: bobInvite1P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite1P, 3, 7);
    const { invite: bobInvite2P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite2P, 8, 2);

    const payout = await payoutP;

    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;
    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
    const { invite: bobInvite3P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite3P, 20, 13);
    const { invite: bobInvite4P } = await E(publicAPI).makeInvite();
    await E(bobP).doSimpleExchangeUpdates(bobInvite4P, 5, 2);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doAutoswap = async bobP => {
    const issuerKeywordRecord = harden({
      TokenA: moolaIssuer,
      TokenB: simoleanIssuer,
    });
    const invite = await E(zoe).makeInstance(
      installations.autoswap,
      issuerKeywordRecord,
    );
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
    const addLiquidityProposal = harden({
      give: { TokenA: moola(10), TokenB: simoleans(5) },
      want: { Liquidity: liquidity(10) },
    });
    const paymentKeywordRecord = harden({
      TokenA: moolaPayment,
      TokenB: simoleanPayment,
    });
    const { seat, payout: payoutP } = await E(zoe).redeem(
      invite,
      addLiquidityProposal,
      paymentKeywordRecord,
    );

    const addLiquidityOutcome = await E(seat).addLiquidity();

    log(addLiquidityOutcome);

    const addLiquidityPayments = await payoutP;
    const liquidityPayout = await addLiquidityPayments.Liquidity;

    const liquidityTokenPurseP = E(liquidityIssuer).makeEmptyPurse();
    await E(liquidityTokenPurseP).deposit(liquidityPayout);

    const bobInviteP = E(publicAPI).makeInvite();
    await E(bobP).doAutoswap(bobInviteP);

    // remove the liquidity
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: liquidity(10) },
      want: { TokenA: moola(0), TokenB: simoleans(0) },
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
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityTokenPayment }),
    );

    const removeLiquidityOutcome = await E(
      removeLiquiditySeat,
    ).removeLiquidity();
    log(removeLiquidityOutcome);

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
