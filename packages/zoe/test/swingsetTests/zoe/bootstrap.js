import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';
import buildManualTimer from '../../../tools/manualTimer';

// eslint-disable-next-line import/no-unresolved, import/extensions
import automaticRefundBundle from './bundle-automaticRefund';
// eslint-disable-next-line import/no-unresolved, import/extensions
import coveredCallBundle from './bundle-coveredCall';
// eslint-disable-next-line import/no-unresolved, import/extensions
import publicAuctionBundle from './bundle-publicAuction';
// eslint-disable-next-line import/no-unresolved, import/extensions
import atomicSwapBundle from './bundle-atomicSwap';
// eslint-disable-next-line import/no-unresolved, import/extensions
import simpleExchangeBundle from './bundle-simpleExchange';
// eslint-disable-next-line import/no-unresolved, import/extensions
import autoswapBundle from './bundle-autoswap';

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
        automaticRefund: await E(zoe).install(
          automaticRefundBundle.source,
          automaticRefundBundle.moduleFormat,
        ),
        coveredCall: await E(zoe).install(
          coveredCallBundle.source,
          coveredCallBundle.moduleFormat,
        ),
        publicAuction: await E(zoe).install(
          publicAuctionBundle.source,
          publicAuctionBundle.moduleFormat,
        ),
        atomicSwap: await E(zoe).install(
          atomicSwapBundle.source,
          atomicSwapBundle.moduleFormat,
        ),
        simpleExchange: await E(zoe).install(
          simpleExchangeBundle.source,
          simpleExchangeBundle.moduleFormat,
        ),
        autoswap: await E(zoe).install(
          autoswapBundle.source,
          autoswapBundle.moduleFormat,
        ),
      };

      const [testName, startingExtents] = argv;

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
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
export default harden(setup);
