import harden from '@agoric/harden';

import { makeMint } from '../../../core/mint';
import { automaticRefundSrcs } from '../../../core/zoe/contracts/automaticRefund';

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

function build(E, log) {
  const obj0 = {
    async bootstrap(argv, vats) {
      async function automaticRefundOk() {
        log(`=> automaticRefundOk called`);
        const zoe = await E(vats.zoe).getZoe();
        const aliceMaker = await E(vats.alice).makeAliceMaker(zoe);
        const bobMaker = await E(vats.bob).makeBobMaker(zoe);
        const { mints, assays } = setupBasicMints();

        // Setup Alice
        const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
        const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));
        const aliceP = E(aliceMaker).make(aliceMoolaPurse, aliceSimoleanPurse);

        // Setup Bob
        const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
        const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(17));
        const bobP = E(bobMaker).make(bobMoolaPurse, bobSimoleanPurse);

        const installationId = E(zoe).install(automaticRefundSrcs);

        log(`=> alice and bob are setup`);
        await E(aliceP).doCreateAutomaticRefund(bobP, installationId);
      }

      switch (argv[0]) {
        case 'automaticRefundOk': {
          return automaticRefundOk();
        }
        default: {
          throw new Error(`unrecognized argument value ${argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
export default harden(setup);
