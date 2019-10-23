import harden from '@agoric/harden';

const build = async (E, log, zoe, moolaPurseP, simoleanPurseP, installId) => {
  const showPaymentBalance = async (paymentP, name) => {
    try {
      const assetDesc = await E(paymentP).getBalance();
      log(name, ': balance ', assetDesc);
    } catch (err) {
      console.error(err);
    }
  };

  const doAutomaticRefund = async bobP => {
    log(`=> alice.doCreateAutomaticRefund called`);

    const moolaAssay = await E(moolaPurseP).getAssay();
    const simoleanAssay = await E(simoleanPurseP).getAssay();

    const assays = harden([moolaAssay, simoleanAssay]);

    const { instance: automaticRefund, instanceId } = await E(zoe).makeInstance(
      installId,
      { assays },
    );

    const conditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: await E(assays[0]).makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: await E(assays[1]).makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const aliceMoolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [aliceMoolaPayment, undefined];
    const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
      conditions,
      offerPayments,
    );

    const offerMadeDesc = await E(automaticRefund).makeOffer(escrowReceipt);
    log(offerMadeDesc);

    await E(bobP).doAutomaticRefund(instanceId);
    const payoff = await payoffP;

    await E(moolaPurseP).depositAll(payoff[0]);
    await E(simoleanPurseP).depositAll(payoff[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse');
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;');
  };

  const doCoveredCall = async bobP => {
    log(`=> alice.doCreateCoveredCall called`);
    const moolaAssay = await E(moolaPurseP).getAssay();
    const simoleanAssay = await E(simoleanPurseP).getAssay();
    const assays = harden([moolaAssay, simoleanAssay]);

    const { instance: coveredCall, instanceId } = await E(zoe).makeInstance(
      installId,
      { assays },
    );

    const conditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: await E(assays[0]).makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: await E(assays[1]).makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const aliceMoolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [aliceMoolaPayment, undefined];
    const { escrowReceipt: aliceEscrowReceipt, payoff: payoffP } = await E(
      zoe,
    ).escrow(conditions, offerPayments);

    const { outcome, invite } = await E(coveredCall).init(aliceEscrowReceipt);
    log(outcome);

    await E(bobP).doCoveredCall(invite, instanceId);
    const payoff = await payoffP;

    await E(moolaPurseP).depositAll(payoff[0]);
    await E(simoleanPurseP).depositAll(payoff[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse');
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;');
  };

  const doPublicAuction = async (bobP, carolP, daveP) => {
    const moolaAssay = await E(moolaPurseP).getAssay();
    const simoleanAssay = await E(simoleanPurseP).getAssay();
    const assays = harden([moolaAssay, simoleanAssay]);

    const numBidsAllowed = 3;
    const { instance: auction, instanceId } = await E(zoe).makeInstance(
      installId,
      { assays, numBidsAllowed },
    );

    const conditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: await E(assays[0]).makeAssetDesc(1),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: await E(assays[1]).makeAssetDesc(3),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
      conditions,
      offerPayments,
    );

    const offerResult = await E(auction).makeOffer(escrowReceipt);

    log(offerResult);

    const bobDoneP = E(bobP).doPublicAuction(instanceId);
    const carolDoneP = E(carolP).doPublicAuction(instanceId);
    const daveDoneP = E(daveP).doPublicAuction(instanceId);

    await Promise.all([bobDoneP, carolDoneP, daveDoneP]);

    const payoff = await payoffP;

    // Alice deposits her winnings to ensure she can
    await E(moolaPurseP).depositAll(payoff[0]);
    await E(simoleanPurseP).depositAll(payoff[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse');
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;');
  };

  const doPublicSwap = async (bobP, carolP) => {
    const moolaAssay = await E(moolaPurseP).getAssay();
    const simoleanAssay = await E(simoleanPurseP).getAssay();
    const assays = harden([moolaAssay, simoleanAssay]);

    const { instance: swap, instanceId } = await E(zoe).makeInstance(
      installId,
      { assays },
    );

    const conditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: await E(assays[0]).makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: await E(assays[1]).makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { escrowReceipt, makePayoffPaymentObj } = await E(zoe).escrow(
      conditions,
      offerPayments,
    );

    const offerResult = await E(swap).makeOffer(escrowReceipt);

    const payoffPaymentForCarolP = await E(
      makePayoffPaymentObj,
    ).makePayoffPayment();

    log(offerResult);

    const carolDoneP = E(carolP).doPublicSwap(
      instanceId,
      payoffPaymentForCarolP,
    );
    const bobDoneP = E(bobP).doPublicSwap(instanceId);
    await Promise.all(carolDoneP, bobDoneP);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse');
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;');
  };

  const doSimpleExchange = async bobP => {
    const moolaAssay = await E(moolaPurseP).getAssay();
    const simoleanAssay = await E(simoleanPurseP).getAssay();
    const assays = harden([moolaAssay, simoleanAssay]);

    const { instance: exchange, instanceId } = await E(zoe).makeInstance(
      installId,
      { assays },
    );

    const aliceSellOrderConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: await E(assays[0]).makeAssetDesc(3),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: await E(assays[1]).makeAssetDesc(4),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const moolaPayment = await E(moolaPurseP).withdrawAll();
    const offerPayments = [moolaPayment, undefined];
    const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
      aliceSellOrderConditions,
      offerPayments,
    );

    const offerResult = await E(exchange).addOrder(escrowReceipt);

    log(offerResult);

    await E(bobP).doSimpleExchange(instanceId);

    const payoff = await payoffP;

    await E(moolaPurseP).depositAll(payoff[0]);
    await E(simoleanPurseP).depositAll(payoff[1]);

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse');
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;');
  };

  const doAutoswap = async bobP => {
    const moolaAssay = await E(moolaPurseP).getAssay();
    const simoleanAssay = await E(simoleanPurseP).getAssay();
    const assays = harden([moolaAssay, simoleanAssay]);

    const { instance: autoswap, instanceId } = await E(zoe).makeInstance(
      installId,
      { assays },
    );
    const liquidityAssay = await E(autoswap).getLiquidityAssay();
    const allAssays = [...assays, liquidityAssay];

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const addLiquidityConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: await E(allAssays[0]).makeAssetDesc(10),
        },
        {
          rule: 'offerExactly',
          assetDesc: await E(allAssays[1]).makeAssetDesc(5),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: await E(allAssays[2]).makeAssetDesc(10),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const moolaPaymentP = E(moolaPurseP).withdrawAll();
    const simoleanPaymentP = E(simoleanPurseP).withdrawAll();
    const offerPayments = [moolaPaymentP, simoleanPaymentP, undefined];
    const { escrowReceipt, payoff: payoffP } = await E(zoe).escrow(
      addLiquidityConditions,
      offerPayments,
    );

    const addLiquidityOutcome = await E(autoswap).addLiquidity(escrowReceipt);

    log(addLiquidityOutcome);

    const addLiquidityPayments = await payoffP;

    const liquidityTokenPurseP = E(liquidityAssay).makeEmptyPurse();
    await E(liquidityTokenPurseP).depositAll(addLiquidityPayments[2]);

    await E(bobP).doAutoswap(instanceId);

    // remove the liquidity
    const aliceRemoveLiquidityOfferDesc = harden({
      offerDesc: [
        {
          rule: 'wantAtLeast',
          assetDesc: await E(allAssays[0]).makeAssetDesc(0),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: await E(allAssays[1]).makeAssetDesc(0),
        },
        {
          rule: 'offerExactly',
          assetDesc: await E(allAssays[2]).makeAssetDesc(10),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const liquidityTokenPayment = await E(liquidityTokenPurseP).withdrawAll();

    const {
      escrowReceipt: aliceRemoveLiquidityEscrowReceipt,
      payoff: aliceRemoveLiquidityPayoffP,
    } = await E(zoe).escrow(
      aliceRemoveLiquidityOfferDesc,
      harden([undefined, undefined, liquidityTokenPayment]),
    );

    const removeLiquidityOutcome = await E(autoswap).removeLiquidity(
      aliceRemoveLiquidityEscrowReceipt,
    );
    log(removeLiquidityOutcome);

    const removeLiquidityPayoffs = await aliceRemoveLiquidityPayoffP;
    await E(moolaPurseP).depositAll(removeLiquidityPayoffs[0]);
    await E(simoleanPurseP).depositAll(removeLiquidityPayoffs[1]);

    log(await E(autoswap).getPoolExtents());

    await showPaymentBalance(moolaPurseP, 'aliceMoolaPurse');
    await showPaymentBalance(simoleanPurseP, 'aliceSimoleanPurse;');
    await showPaymentBalance(liquidityTokenPurseP, 'aliceLiquidityTokenPurse');
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
        case 'publicAuctionOk': {
          return doPublicAuction(bobP, carolP, daveP);
        }
        case 'publicSwapOk': {
          return doPublicSwap(bobP, carolP, daveP);
        }
        case 'simpleExchangeOk': {
          return doSimpleExchange(bobP, carolP, daveP);
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
