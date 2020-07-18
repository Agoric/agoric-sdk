/* global harden */

import { E } from '@agoric/eventual-send';
import produceIssuer from '@agoric/ertp';
import buildManualTimer from '../../../tools/manualTimer';

/* eslint-disable import/no-unresolved, import/extensions */
import automaticRefundBundle from './bundle-automaticRefund';
import coveredCallBundle from './bundle-coveredCall';
import publicAuctionBundle from './bundle-publicAuction';
import atomicSwapBundle from './bundle-atomicSwap';
import simpleExchangeBundle from './bundle-simpleExchange';
import autoswapBundle from './bundle-autoswap';
import sellItemsBundle from './bundle-sellItems';
import mintAndSellNFTBundle from './bundle-mintAndSellNFT';
/* eslint-enable import/no-unresolved, import/extensions */

const setupBasicMints = () => {
  const all = [
    produceIssuer('moola'),
    produceIssuer('simoleans'),
    produceIssuer('bucks'),
  ];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const amountMaths = all.map(objs => objs.amountMath);

  return harden({
    mints,
    issuers,
    amountMaths,
  });
};

const makeVats = (log, vats, zoe, installations, startingExtents) => {
  const timer = buildManualTimer(log);
  const { mints, issuers, amountMaths } = setupBasicMints();
  const makePayments = extents =>
    mints.map((mint, i) => mint.mintPayment(amountMaths[i].make(extents[i])));
  const [aliceExtents, bobExtents, carolExtents, daveExtents] = startingExtents;

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    issuers,
    makePayments(aliceExtents),
    installations,
    timer,
  );

  // Setup Bob
  const bobP = E(vats.bob).build(
    zoe,
    issuers,
    makePayments(bobExtents),
    installations,
    timer,
  );

  const result = {
    aliceP,
    bobP,
  };

  if (carolExtents) {
    const carolP = E(vats.carol).build(
      zoe,
      issuers,
      makePayments(carolExtents),
      installations,
      timer,
    );
    result.carolP = carolP;
  }

  if (daveExtents) {
    const daveP = E(vats.dave).build(
      zoe,
      issuers,
      makePayments(daveExtents),
      installations,
      timer,
    );
    result.daveP = daveP;
  }

  log(`=> alice, bob, carol and dave are set up`);
  return harden(result);
};

function build(log) {
  const obj0 = {
    async bootstrap(argv, vats) {
      const zoe = await E(vats.zoe).getZoe();

      const installations = {
        automaticRefund: await E(zoe).install(automaticRefundBundle.bundle),
        coveredCall: await E(zoe).install(coveredCallBundle.bundle),
        publicAuction: await E(zoe).install(publicAuctionBundle.bundle),
        atomicSwap: await E(zoe).install(atomicSwapBundle.bundle),
        simpleExchange: await E(zoe).install(simpleExchangeBundle.bundle),
        autoswap: await E(zoe).install(autoswapBundle.bundle),
        sellItems: await E(zoe).install(sellItemsBundle.bundle),
        mintAndSellNFT: await E(zoe).install(mintAndSellNFTBundle.bundle),
      };

      const [testName, startingExtents] = argv;

      const { aliceP, bobP, carolP, daveP } = makeVats(
        log,
        vats,
        zoe,
        installations,
        startingExtents,
      );
      await E(aliceP).startTest(testName, bobP, carolP, daveP);
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers => build(helpers.log),
    helpers.vatID,
  );
}
export default harden(setup);
