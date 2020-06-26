import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';
import buildManualTimer from './manualTimer';
import { makePrintLog } from './printLog';

/* eslint-disable import/no-unresolved, import/extensions */
import automaticRefundBundle from './bundle-automaticRefund';
import coveredCallBundle from './bundle-coveredCall';
import publicAuctionBundle from './bundle-publicAuction';
import atomicSwapBundle from './bundle-atomicSwap';
import simpleExchangeBundle from './bundle-simpleExchange';
import autoswapBundle from './bundle-autoswap';
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

const makeVats = (E, log, vats, zoe, installations, startingExtents) => {
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

function build(E, log) {
  const obj0 = {
    async bootstrap(argv, vats) {
      const zoe = await E(vats.zoe).getZoe();

      const installations = {
        automaticRefund: await E(zoe).install(automaticRefundBundle),
        coveredCall: await E(zoe).install(coveredCallBundle),
        publicAuction: await E(zoe).install(publicAuctionBundle),
        atomicSwap: await E(zoe).install(atomicSwapBundle),
        simpleExchange: await E(zoe).install(simpleExchangeBundle),
        autoswap: await E(zoe).install(autoswapBundle),
      };

      // automaticRefundOk '[[3,0,0],[0,17,0]]'
      // coveredCallOk '[[3,0,0],[0,7,0]]'
      // swapForOptionOk '[[3,0,0],[0,0,0],[0,0,0],[0,7,1]]'
      // publicAuctionOk '[[1,0,0],[0,11,0],[0,7,0],[0,5,0]]'
      // atomicSwapOk '[[3,0,0],[0,7,0]]'
      // simpleExchangeOk '[[3,0,0],[0,7,0]]'
      // simpleExchangeNotifier '[[3,0,0],[0,24,0]]'
      // autoswapOk '[[10,5,0],[3,7,0]]'

      const [testName, startingExtentsStr] = argv;
      const startingExtents = JSON.parse(startingExtentsStr);

      const { aliceP, bobP, carolP, daveP } = makeVats(
        E,
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
    E => build(E, makePrintLog(helpers.log)),
    helpers.vatID,
  );
}
export default harden(setup);
