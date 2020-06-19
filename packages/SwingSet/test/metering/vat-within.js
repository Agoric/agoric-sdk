import harden from '@agoric/harden';
import { importBundle } from '@agoric/import-bundle';

function vatRequire(what) {
  if (what === '@agoric/harden') {
    return harden;
  } else {
    throw Error(`vatRequire unprepared to satisfy require(${what})`);
  }
}

function build(buildStuff) {
  const { E, D, vatPowers, log } = buildStuff;
  const { makeGetMeter, transformMetering } = vatPowers;
  const { getMeter, isExhausted, resetMeterUsed, getMeterUsed, refillFacet, resetGlobalMeter } = makeGetMeter({refillEachCrank: false});

  // The guest code will be transformed by injecting code. The modifications
  // cause it to call getMeter() upon entry into each block (and other
  // places), and if that returns a meter, the meter is charged (and might
  // throw an exception if it runs out). We use getMeter() to sense when this
  // guest code gets control (we can pass a different getMeter() to each
  // guest).

  const log2 = [];
  let meterMe;

  const root = {
    async start(bundle) {
      //console.log(`vatPowers`, vatPowers);
      //console.log('bundle', bundle);
      const endowments = { require: vatRequire, console, getMeter };
      // console.log('doing importBundle');
      log('importing');
      const ns = await importBundle(bundle, {
        endowments,
        transforms: [src => transformMetering(src, getMeter)],
      });
      // console.log('ns', ns);
      meterMe = ns.default;
      log('imported');
    },

    run(mode) {
      log(`run ${mode}`);
      log2.splice(0);
      resetMeterUsed();
      try {
        meterMe(log2, mode);
      } catch (e) {
        //resetGlobalMeter();
        // The GlobalMeter is still active (billed to the bundle's meter),
        // and might be exhausted, so any global objects we use here might
        // throw (like console.log). TODO: but I seem to be able to use
        // console.log (and Object.create({}), and other things which I think
        // ought to be decrementing the global COMPUTE meter) even after
        // meterMe() exhausted the compute meter, so something odd is going
        // on.

        // TODO when vats are metered as a whole, we can configure this
        // vat-within.js to be metered, which will inject a call at the
        // beginning of this catch block (and all blocks) to reset the global
        // meter to our own meter, which *won't* be exhausted, and this
        // warning comment can go away. For now, avoid touching any globals
        // until the crank is done.

        // console.log(`exception during meterMe`, e);
        log(`log2: ${log2.join(' ')}`);
        log(`exception (${isExhausted()})`);
        return;
      }
      log(`log2: ${log2.join(' ')}`);
      log(`no exception`);
    },

    async refill(mode) {
      refillFacet[mode](10000000);
    },

  };
  return harden(root);
}

export default function setup(syscall, state, helpers, vatPowers) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(syscall, state, (E, D, vatPowers) => build({E, D, vatPowers, log}), helpers.vatID, vatPowers);
}
