// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

import { showPurseBalance, setupIssuers } from '../helpers';

async function logCounter(log, publicAPI) {
  log(`counter: ${await E(publicAPI).getOffersCount()}`);
}

const build = async (log, zoe, issuers, payments, installations, timer) => {
  const { moola, simoleans, bucks, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;
  const [moolaPayment, simoleanPayment, bucksPayment] = payments;
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;

  const doAutomaticRefund = async bobP => {
    log(`=> alice.doCreateAutomaticRefund called`);
    const installId = installations.automaticRefund;
    const issuerKeywordRecord = harden({
      Contribution1: moolaIssuer,
      Contribution2: simoleanIssuer,
    });
    const { publicFacet, creatorInvitation: refundInvitation } = await E(
      zoe,
    ).startInstance(installId, issuerKeywordRecord);

    const proposal = harden({
      give: { Contribution1: moola(3) },
      want: { Contribution2: simoleans(7) },
      exit: { onDemand: null },
    });

    const paymentKeywordRecord = { Contribution1: moolaPayment };
    const refundSeatP = await E(zoe).offer(
      refundInvitation,
      proposal,
      paymentKeywordRecord,
    );
    log(await E(refundSeatP).getOfferResult());

    const bobInvitation = E(publicFacet).makeInvitation();
    await E(bobP).doAutomaticRefund(bobInvitation);
    const moolaPayout = await E(refundSeatP).getPayout('Contribution1');
    const simoleanPayout = await E(refundSeatP).getPayout('Contribution2');

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doCoveredCall = async bobP => {
    log(`=> alice.doCreateCoveredCall called`);
    const installation = installations.coveredCall;
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const { creatorInvitation: writeCallInvitation, adminFacet } = await E(
      zoe,
    ).startInstance(installation, issuerKeywordRecord);

    E(adminFacet)
      .getVatShutdownPromise()
      .then(
        completion => log(`covered call was shut down due to "${completion}"`),
        reason => log(`covered call failed due to "${reason}"`),
      );

    const proposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: { afterDeadline: { deadline: 1n, timer } },
    });

    const paymentKeywordRecord = { UnderlyingAsset: moolaPayment };
    const seatP = await E(zoe).offer(
      writeCallInvitation,
      proposal,
      paymentKeywordRecord,
    );

    const optionP = E(seatP).getOfferResult();
    await E(bobP).doCoveredCall(optionP);
    const moolaPayout = await E(seatP).getPayout('UnderlyingAsset');
    const simoleanPayout = await E(seatP).getPayout('StrikePrice');
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
    const { creatorInvitation: writeCallInvitation } = await E(
      zoe,
    ).startInstance(installations.coveredCall, issuerKeywordRecord);

    const proposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 100n,
          timer,
        },
      },
    });

    const paymentKeywordRecord = harden({ UnderlyingAsset: moolaPayment });
    const seatP = await E(zoe).offer(
      writeCallInvitation,
      proposal,
      paymentKeywordRecord,
    );

    log('call option made');
    const invitationForBob = E(seatP).getOfferResult();
    await E(bobP).doSwapForOption(invitationForBob, daveP);
    const moolaPayout = await E(seatP).getPayout('UnderlyingAsset');
    const simoleanPayout = await E(seatP).getPayout('StrikePrice');

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doSecondPriceAuction = async (bobP, carolP, daveP) => {
    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Ask: simoleanIssuer,
    });
    const now = await E(timer).getCurrentTimestamp();
    const terms = harden({ timeAuthority: timer, closesAfter: now + 1n });
    const { creatorInvitation: sellAssetsInvitation } = await E(
      zoe,
    ).startInstance(
      installations.secondPriceAuction,
      issuerKeywordRecord,
      terms,
    );

    const proposal = harden({
      give: { Asset: moola(1) },
      want: { Ask: simoleans(3) },
      exit: { waived: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const aliceSeatP = await E(zoe).offer(
      sellAssetsInvitation,
      proposal,
      paymentKeywordRecord,
    );

    const makeBidInvitationObj = await E(aliceSeatP).getOfferResult();
    const bobInvitation = E(makeBidInvitationObj).makeBidInvitation();
    const carolInvitation = E(makeBidInvitationObj).makeBidInvitation();
    const daveInvitation = E(makeBidInvitationObj).makeBidInvitation();

    const bobBidDoneP = E(bobP).doSecondPriceAuctionBid(bobInvitation);
    const carolBidDoneP = E(carolP).doSecondPriceAuctionBid(carolInvitation);
    const daveBidDoneP = E(daveP).doSecondPriceAuctionBid(daveInvitation);

    await Promise.all([bobBidDoneP, carolBidDoneP, daveBidDoneP]);
    await E(timer).tick();

    const bobCollectDoneP = E(bobP).doSecondPriceAuctionGetPayout();
    const carolCollectDoneP = E(carolP).doSecondPriceAuctionGetPayout();
    const daveCollectDoneP = E(daveP).doSecondPriceAuctionGetPayout();
    await Promise.all([bobCollectDoneP, carolCollectDoneP, daveCollectDoneP]);

    const moolaPayout = await E(aliceSeatP).getPayout('Asset');
    const simoleanPayout = await E(aliceSeatP).getPayout('Ask');

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
    const { creatorInvitation: firstOfferInvitation } = await E(
      zoe,
    ).startInstance(installations.atomicSwap, issuerKeywordRecord);

    const proposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const seatP = await E(zoe).offer(
      firstOfferInvitation,
      proposal,
      paymentKeywordRecord,
    );

    E(bobP).doAtomicSwap(E(seatP).getOfferResult());

    const moolaPayout = await E(seatP).getPayout('Asset');
    const simoleanPayout = await E(seatP).getPayout('Price');

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
    const { publicFacet } = await E(zoe).startInstance(
      // Either installations or promises for installations can be used
      Promise.resolve(simpleExchange),
      issuerKeywordRecord,
    );

    const addOrderInvitation = await E(publicFacet).makeInvitation();
    const aliceSellOrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const addOrderSeatP = await E(zoe).offer(
      addOrderInvitation,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    log(await E(addOrderSeatP).getOfferResult());

    const bobInvitationP = E(publicFacet).makeInvitation();
    await E(bobP).doSimpleExchange(bobInvitationP);
    const moolaPayout = await E(addOrderSeatP).getPayout('Asset');
    const simoleanPayout = await E(addOrderSeatP).getPayout('Price');

    await E(moolaPurseP).deposit(await moolaPayout);
    await E(simoleanPurseP).deposit(await simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  function logStateOnChanges(notifier, lastCount = undefined) {
    const updateRecordP = E(notifier).getUpdateSince(lastCount);
    updateRecordP.then(updateRec => {
      log(updateRec.value);
      logStateOnChanges(notifier, updateRec.updateCount);
    });
  }

  const doSimpleExchangeWithNotification = async bobP => {
    const issuerKeywordRecord = harden({
      Price: simoleanIssuer,
      Asset: moolaIssuer,
    });
    const { simpleExchange } = installations;
    const { publicFacet } = await E(zoe).startInstance(
      simpleExchange,
      issuerKeywordRecord,
    );

    logStateOnChanges(await E(publicFacet).getNotifier());

    const aliceSellOrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = { Asset: moolaPayment };
    const addOrderInvitation = await E(publicFacet).makeInvitation();
    const addOrderSeatP = await E(zoe).offer(
      addOrderInvitation,
      aliceSellOrderProposal,
      paymentKeywordRecord,
    );

    log(await E(addOrderSeatP).getOfferResult());

    const bobInvitation1P = E(publicFacet).makeInvitation();
    await E(bobP).doSimpleExchangeUpdates(bobInvitation1P, 3, 7);
    const bobInvitation2P = E(publicFacet).makeInvitation();
    await E(bobP).doSimpleExchangeUpdates(bobInvitation2P, 8, 2);

    const moolaPayout = await E(addOrderSeatP).getPayout('Asset');
    const simoleanPayout = await E(addOrderSeatP).getPayout('Price');

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
    const bobInvitation3P = E(publicFacet).makeInvitation();
    await E(bobP).doSimpleExchangeUpdates(bobInvitation3P, 20, 13);
    const bobInvitation4P = E(publicFacet).makeInvitation();
    await E(bobP).doSimpleExchangeUpdates(bobInvitation4P, 5, 2);
    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  const doAutoswap = async bobP => {
    const issuerKeywordRecord = harden({
      Central: moolaIssuer,
      Secondary: simoleanIssuer,
    });
    const { publicFacet, instance } = await E(zoe).startInstance(
      installations.autoswap,
      issuerKeywordRecord,
    );
    const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
    const liquidityBrand = await E(liquidityIssuer).getBrand();
    const liquidity = value => AmountMath.make(value, liquidityBrand);

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const addLiquidityProposal = harden({
      give: { Central: moola(10), Secondary: simoleans(5) },
      want: { Liquidity: liquidity(10) },
    });
    const paymentKeywordRecord = harden({
      Central: moolaPayment,
      Secondary: simoleanPayment,
    });
    const addLiquidityInvitation = E(publicFacet).makeAddLiquidityInvitation();
    const addLiqSeatP = await E(zoe).offer(
      addLiquidityInvitation,
      addLiquidityProposal,
      paymentKeywordRecord,
    );

    log(await E(addLiqSeatP).getOfferResult());

    const liquidityPayout = await E(addLiqSeatP).getPayout('Liquidity');

    const liquidityTokenPurseP = E(liquidityIssuer).makeEmptyPurse();
    await E(liquidityTokenPurseP).deposit(liquidityPayout);

    await E(bobP).doAutoswap(instance);

    // remove the liquidity
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: liquidity(10) },
      want: { Central: moola(0n), Secondary: simoleans(0) },
    });

    const liquidityTokenPayment = await E(liquidityTokenPurseP).withdraw(
      liquidity(10),
    );
    const removeLiquidityInvitation = E(
      publicFacet,
    ).makeRemoveLiquidityInvitation();

    const removeLiquiditySeatP = await E(zoe).offer(
      removeLiquidityInvitation,
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityTokenPayment }),
    );

    log(await E(removeLiquiditySeatP).getOfferResult());

    const moolaPayout = await E(removeLiquiditySeatP).getPayout('Central');
    const simoleanPayout = await E(removeLiquiditySeatP).getPayout('Secondary');

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    const poolAmounts = await E(publicFacet).getPoolAllocation();

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
    const { creatorFacet } = await E(zoe).startInstance(mintAndSellNFT);

    // completeObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
    const {
      sellItemsInstance: ticketSalesInstance,
      sellItemsCreatorSeat,
      sellItemsPublicFacet,
      sellItemsCreatorFacet,
    } = await E(creatorFacet).sellTokens({
      customValueProperties: {
        show: 'Steven Universe, the Opera',
        start: 'Wed, March 25th 2020 at 8pm',
      },
      count: 3,
      moneyIssuer: moolaIssuer,
      sellItemsInstallation: installations.sellItems,
      pricePerItem: moola(22),
    });
    const buyerInvitation = E(sellItemsCreatorFacet).makeBuyerInvitation();
    await E(bobP).doBuyTickets(ticketSalesInstance, buyerInvitation);

    const availableTickets = await E(sellItemsPublicFacet).getAvailableItems();

    log('after ticket1 purchased: ', availableTickets);

    await E(sellItemsCreatorSeat).tryExit();

    const moneyPayment = await E(sellItemsCreatorSeat).getPayout('Money');
    await E(moolaPurseP).deposit(moneyPayment);
    const currentPurseBalance = await E(moolaPurseP).getCurrentAmount();

    log('alice earned: ', currentPurseBalance);
  };

  const doOTCDesk = async bobP => {
    const { creatorFacet } = await E(zoe).startInstance(
      installations.otcDesk,
      undefined,
      { coveredCallInstallation: installations.coveredCall },
    );

    // Add inventory
    const addInventoryInvitation = await E(
      creatorFacet,
    ).makeAddInventoryInvitation({
      Moola: moolaIssuer,
      Simolean: simoleanIssuer,
      Buck: bucksIssuer,
    });
    const addInventoryProposal = harden({
      give: {
        Moola: moola(10000),
        Simolean: simoleans(10000),
        Buck: bucks(10000),
      },
    });
    const addInventoryPayments = {
      Moola: moolaPayment,
      Simolean: simoleanPayment,
      Buck: bucksPayment,
    };

    const addInventorySeat = await E(zoe).offer(
      addInventoryInvitation,
      addInventoryProposal,
      addInventoryPayments,
    );
    const addInventoryOfferResult = await E(addInventorySeat).getOfferResult();
    log(addInventoryOfferResult);
    const bobInvitation = await E(creatorFacet).makeQuote(
      { Simolean: simoleans(4) },
      { Moola: moola(3) },
      timer,
      1n,
    );

    await E(bobP).doOTCDesk(bobInvitation);

    // Remove Inventory
    const removeInventoryInvitation = await E(
      creatorFacet,
    ).makeRemoveInventoryInvitation();
    // Intentionally do not remove it all
    const removeInventoryProposal = harden({
      want: { Simolean: simoleans(2) },
    });
    const removeInventorySeat = await E(zoe).offer(
      removeInventoryInvitation,
      removeInventoryProposal,
    );
    const removeInventoryOfferResult = await E(
      removeInventorySeat,
    ).getOfferResult();
    log(removeInventoryOfferResult);
    const simoleanPayout = await E(removeInventorySeat).getPayout('Simolean');

    log(await E(simoleanIssuer).getAmountOf(simoleanPayout));
  };

  const doBadTimer = async () => {
    log(`=> alice.doBadTimer called`);
    const installation = installations.coveredCall;
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaIssuer,
      StrikePrice: simoleanIssuer,
    });
    const { creatorInvitation: writeCallInvitation } = await E(
      zoe,
    ).startInstance(installation, issuerKeywordRecord);

    const proposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          timer: Far('timer', { setWakeup: () => {} }),
          deadline: 1n,
        },
      },
    });

    const paymentKeywordRecord = { UnderlyingAsset: moolaPayment };

    const seatP = await E(zoe).offer(
      writeCallInvitation,
      proposal,
      paymentKeywordRecord,
    );

    // Bad timer error is logged but does not cause seat methods to
    // throw.
    const callOption = await E(seatP).getOfferResult();
    const invitationIssuer = await E(zoe).getInvitationIssuer();
    const isInvitation = await E(invitationIssuer).isLive(callOption);
    log(`is a zoe invitation: ${isInvitation}`);

    // The seat is automatically exited
    const moolaPayout = await E(seatP).getPayout('UnderlyingAsset');
    const simoleanPayout = await E(seatP).getPayout('StrikePrice');
    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
  };

  // Crashing Contract tests

  const doThrowInHook = async () => {
    log(`=> alice.doThrowInHook called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { publicFacet } = await E(zoe).startInstance(
      installId,
      issuerKeywordRecord,
    );
    const proposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const alicePayments = { Asset: moolaPayment };

    logCounter(log, publicFacet);
    const invitation = await E(publicFacet).makeThrowingInvitation();
    const seat = await E(zoe).offer(invitation, proposal, alicePayments);

    E(seat)
      .getOfferResult()
      .then(
        () => assert(false, ' expected outcome to fail'),
        e => log(`outcome correctly resolves to broken: ${e}`),
      );
    logCounter(log, publicFacet);
    const moolaPayout = await E(seat).getPayout('Asset');
    const simoleanPayout = await E(seat).getPayout('Price');

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    logCounter(log, publicFacet);
  };

  const doThrowInApiCall = async () => {
    log(`=> alice.doThrowInApiCall called`);
    const installId = installations.crashAutoRefund;

    const { publicFacet } = await E(zoe).startInstance(installId);

    E(publicFacet)
      .throwSomething()
      .then(
        () => assert(false, 'expecting this to throw'),
        e => log(`throwingAPI should throw ${e}`),
      );

    // show that the contract is still responsive.
    logCounter(log, publicFacet);
  };

  const doThrowInMakeContract = async () => {
    log(`=> alice.doThrowInMakeContract called`);
    const installId = installations.crashAutoRefund;

    E(zoe)
      .startInstance(installId, undefined, { throw: true })
      .then(
        () => assert(false, 'contract should not finish creation'),
        e => log(`contract creation failed: ${e}`),
      );

    // We should still be able to create new vats.
    const { publicFacet: publicFacet2 } = await E(zoe).startInstance(installId);
    log(`newCounter: ${await E(publicFacet2).getOffersCount()}`);
  };

  // contract attempts a clean shutdown, but there are outstanding seats
  const doHappyTerminationWithOffers = async () => {
    log(`=> alice.doHappyTerminationWOffers called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { publicFacet, adminFacet } = await E(zoe).startInstance(
      installId,
      issuerKeywordRecord,
    );

    // wait for the contract to finish.
    E(adminFacet)
      .getVatShutdownPromise()
      .then(
        reason => {
          return log(`happy termination saw "${reason}"`);
        },
        e => log(`happy termination saw reject "${e}"`),
      );

    // Alice submits an offer. The contract will be terminated before resolution
    const swapProposal = harden({
      give: { Asset: moola(5) },
      want: { Price: simoleans(12) },
      exit: { onDemand: null },
    });
    const aliceSwapPayments = { Asset: moolaPayment };
    const invitation = await E(publicFacet).makeInvitation();
    const invitation2 = await E(publicFacet).makeInvitation();
    const seat = await E(zoe).offer(
      invitation,
      swapProposal,
      aliceSwapPayments,
    );
    E(seat)
      .getOfferResult()
      .then(
        o => log(`offer result resolves to undefined: ${o}`),
        e => log(`offer result rejected before fulfillment: "${e}"`),
      );

    // contract asks for clean termination
    E(publicFacet).zcfShutdown('Success');
    log(`seat has been exited: ${E(seat).hasExited()}`);

    const moolaSwapRefund = await E(seat).getPayout('Asset');
    const simoleanSwapPayout = await E(seat).getPayout('Price');

    const moolaPurse2P = E(moolaIssuer).makeEmptyPurse();
    const simoleanPurse2P = E(simoleanIssuer).makeEmptyPurse();
    await E(moolaPurse2P).deposit(moolaSwapRefund);
    await E(simoleanPurse2P).deposit(simoleanSwapPayout);
    await showPurseBalance(moolaPurse2P, 'second moolaPurse', log);
    await showPurseBalance(simoleanPurse2P, 'second simoleanPurse', log);

    // After shutdown, attempts to make offers and invitations fail
    await E(zoe)
      .offer(invitation2)
      .then(
        () => log(`fail: expected offer to be refused`),
        e => log(`offer correctly refused: "${e}"`),
      );
    E(publicFacet)
      .makeInvitation()
      .catch(e => log(`can't make more invitations because "${e}"`));
  };

  const doSadTermination = async () => {
    log(`=> alice.doSadTermination called`);
    const installId = installations.crashAutoRefund;

    const { publicFacet, adminFacet } = await E(zoe).startInstance(installId);

    E(adminFacet)
      .getVatShutdownPromise()
      .then(
        reason => {
          return log(`sad termination saw "${reason}"`);
        },
        e => log(`sad termination saw reject "${e}"`),
      );

    E(publicFacet).zcfShutdownWithFailure('Sadness');
  };

  return Far('build', {
    startTest: async (testName, bobP, carolP, daveP) => {
      switch (testName) {
        case 'automaticRefundOk': {
          return doAutomaticRefund(bobP);
        }
        case 'coveredCallOk': {
          return doCoveredCall(bobP);
        }
        case 'swapForOptionOk': {
          return doSwapForOption(bobP, carolP, daveP);
        }
        case 'secondPriceAuctionOk': {
          return doSecondPriceAuction(bobP, carolP, daveP);
        }
        case 'atomicSwapOk': {
          return doAtomicSwap(bobP);
        }
        case 'simpleExchangeOk': {
          return doSimpleExchange(bobP);
        }
        case 'simpleExchangeNotifier': {
          return doSimpleExchangeWithNotification(bobP);
        }
        case 'autoswapOk': {
          return doAutoswap(bobP);
        }
        case 'sellTicketsOk': {
          return doSellTickets(bobP);
        }
        case 'otcDeskOk': {
          return doOTCDesk(bobP);
        }
        case 'badTimer': {
          return doBadTimer();
        }
        case 'throwInOfferHook': {
          return doThrowInHook();
        }
        case 'throwInApiCall': {
          return doThrowInApiCall();
        }
        case 'throwInMakeContract': {
          return doThrowInMakeContract();
        }
        case 'happyTerminationWOffers': {
          return doHappyTerminationWithOffers();
        }
        case 'sadTermination': {
          return doSadTermination();
        }
        default: {
          assert.fail(X`testName ${testName} not recognized`);
        }
      }
    },
  });
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
