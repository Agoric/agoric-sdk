import harden from '@agoric/harden';

import { makeMint } from '@agoric/ertp/core/mint';
import buildManualTimer from '@agoric/ertp/tools/manualTimer';

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
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');
  const bucksMint = makeMint('bucks');

  const moolaAssay = moolaMint.getAssay();
  const simoleanAssay = simoleanMint.getAssay();
  const bucksAssay = bucksMint.getAssay();

  const moolaDescOps = moolaAssay.getUnitOps();
  const simoleanDescOps = simoleanAssay.getUnitOps();
  const bucksDescOps = bucksAssay.getUnitOps();

  return harden({
    mints: [moolaMint, simoleanMint, bucksMint],
    assays: [moolaAssay, simoleanAssay, bucksAssay],
    unitOps: [moolaDescOps, simoleanDescOps, bucksDescOps],
  });
};

const makeVats = (E, log, vats, zoe, installations, startingExtents) => {
  const timer = buildManualTimer(log);
  const { mints, assays } = setupBasicMints();
  const makePurses = extents =>
    mints.map((mint, i) => mint.mint(assays[i].makeUnits(extents[i])));
  const [aliceExtents, bobExtents, carolExtents, daveExtents] = startingExtents;

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    makePurses(aliceExtents),
    installations,
    timer,
  );

  // Setup Bob
  const bobP = E(vats.bob).build(
    zoe,
    makePurses(bobExtents),
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
      makePurses(carolExtents),
      installations,
      timer,
    );
    result.carolP = carolP;
  }

  if (daveExtents) {
    const daveP = E(vats.dave).build(
      zoe,
      makePurses(daveExtents),
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
