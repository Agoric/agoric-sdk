import harden from '@agoric/harden';

import { makeMint } from '@agoric/ertp/core/mint';

import automaticRefundBundle from './bundle-automaticRefund';
import coveredCallBundle from './bundle-coveredCall';
import publicAuctionBundle from './bundle-publicAuction';
import publicSwapBundle from './bundle-publicSwap';
import simpleExchangeBundle from './bundle-simpleExchange';
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

const makeVats = (E, log, vats, zoe, installationHandle, startingExtents) => {
  const { mints, assays } = setupBasicMints();
  const [aliceExtents, bobExtents, carolExtents, daveExtents] = startingExtents;
  // Setup Alice
  const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(aliceExtents[0]));
  const aliceSimoleanPurse = mints[1].mint(
    assays[1].makeUnits(aliceExtents[1]),
  );
  const aliceP = E(vats.alice).build(
    zoe,
    aliceMoolaPurse,
    aliceSimoleanPurse,
    installationHandle,
  );

  // Setup Bob
  const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(bobExtents[0]));
  const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(bobExtents[1]));
  const bobP = E(vats.bob).build(
    zoe,
    bobMoolaPurse,
    bobSimoleanPurse,
    installationHandle,
  );

  const result = {
    aliceP,
    bobP,
  };

  if (carolExtents) {
    const carolMoolaPurse = mints[0].mint(assays[0].makeUnits(carolExtents[0]));
    const carolSimoleanPurse = mints[1].mint(
      assays[1].makeUnits(carolExtents[1]),
    );
    const carolP = E(vats.carol).build(
      zoe,
      carolMoolaPurse,
      carolSimoleanPurse,
      installationHandle,
    );
    result.carolP = carolP;
  }

  if (daveExtents) {
    const daveMoolaPurse = mints[0].mint(assays[0].makeUnits(daveExtents[0]));
    const daveSimoleanPurse = mints[1].mint(
      assays[1].makeUnits(daveExtents[1]),
    );
    const daveP = E(vats.dave).build(
      zoe,
      daveMoolaPurse,
      daveSimoleanPurse,
      installationHandle,
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
        publicSwap: await E(zoe).install(
          publicSwapBundle.source,
          publicSwapBundle.moduleFormat,
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

      const [testName, installation, startingExtents] = argv;

      const { aliceP, bobP, carolP, daveP } = makeVats(
        E,
        log,
        vats,
        zoe,
        installations[installation],
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
