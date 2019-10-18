import harden from '@agoric/harden';

import { makeMint } from '../../../core/mint';
import { automaticRefundSrcs } from '../../../core/zoe/contracts/automaticRefund';
import { coveredCallSrcs } from '../../../core/zoe/contracts/coveredCall';
import { publicAuctionSrcs } from '../../../core/zoe/contracts/publicAuction';
import { publicSwapSrcs } from '../../../core/zoe/contracts/publicSwap';
import { simpleExchangeSrcs } from '../../../core/zoe/contracts/simpleExchange';
// TODO: test autoswap

const setupBasicMints = () => {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');
  const bucksMint = makeMint('bucks');

  const moolaAssay = moolaMint.getAssay();
  const simoleanAssay = simoleanMint.getAssay();
  const bucksAssay = bucksMint.getAssay();

  const moolaDescOps = moolaAssay.getDescOps();
  const simoleanDescOps = simoleanAssay.getDescOps();
  const bucksDescOps = bucksAssay.getDescOps();

  return harden({
    mints: [moolaMint, simoleanMint, bucksMint],
    assays: [moolaAssay, simoleanAssay, bucksAssay],
    descOps: [moolaDescOps, simoleanDescOps, bucksDescOps],
  });
};

const makeVats = (E, log, vats, zoe, installationId, startingExtents) => {
  const { mints, assays } = setupBasicMints();
  const [aliceExtents, bobExtents, carolExtents, daveExtents] = startingExtents;
  // Setup Alice
  const aliceMoolaPurse = mints[0].mint(
    assays[0].makeAssetDesc(aliceExtents[0]),
  );
  const aliceSimoleanPurse = mints[1].mint(
    assays[1].makeAssetDesc(aliceExtents[1]),
  );
  const aliceP = E(vats.alice).build(
    zoe,
    aliceMoolaPurse,
    aliceSimoleanPurse,
    installationId,
  );

  // Setup Bob
  const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(bobExtents[0]));
  const bobSimoleanPurse = mints[1].mint(
    assays[1].makeAssetDesc(bobExtents[1]),
  );
  const bobP = E(vats.bob).build(
    zoe,
    bobMoolaPurse,
    bobSimoleanPurse,
    installationId,
  );

  const result = {
    aliceP,
    bobP,
  };

  if (carolExtents) {
    const carolMoolaPurse = mints[0].mint(
      assays[0].makeAssetDesc(carolExtents[0]),
    );
    const carolSimoleanPurse = mints[1].mint(
      assays[1].makeAssetDesc(carolExtents[1]),
    );
    const carolP = E(vats.carol).build(
      zoe,
      carolMoolaPurse,
      carolSimoleanPurse,
      installationId,
    );
    result.carolP = carolP;
  }

  if (daveExtents) {
    const daveMoolaPurse = mints[0].mint(
      assays[0].makeAssetDesc(daveExtents[0]),
    );
    const daveSimoleanPurse = mints[1].mint(
      assays[1].makeAssetDesc(daveExtents[1]),
    );
    const daveP = E(vats.dave).build(
      zoe,
      daveMoolaPurse,
      daveSimoleanPurse,
      installationId,
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
        automaticRefund: await E(zoe).install(automaticRefundSrcs),
        coveredCall: await E(zoe).install(coveredCallSrcs),
        publicAuction: await E(zoe).install(publicAuctionSrcs),
        publicSwap: await E(zoe).install(publicSwapSrcs),
        simpleExchange: await E(zoe).install(simpleExchangeSrcs),
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
