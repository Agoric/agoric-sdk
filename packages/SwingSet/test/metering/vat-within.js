import harden from '@agoric/harden';
import { importBundle } from '@agoric/import-bundle';
import { makeMeter } from '@agoric/transform-metering';

function build(buildStuff) {
  const { E, D, vatPowers, log } = buildStuff;
  const { setMeter, transformMetering } = vatPowers;
  const { meter, refillFacet } = makeMeter();

  // The guest code will be transformed by injecting code. The modifications
  // cause it to call getMeter() upon entry into each block (and other
  // places), and if that returns a meter, the meter is charged (and might
  // throw an exception if it runs out). We use getMeter() to sense when this
  // guest code gets control (we can pass a different getMeter() to each
  // guest).

  let meterUsed = false;
  function getMeter() {
    if (!meterUsed) {
      // console.log(`getMeter first time`);
      meterUsed = true;
    }
    // Tell the kernel to enable "global metering" on JS builtins. This will
    // remain active until we call setMeter() again, or the crank is complete
    // (whereupon the kernel will turn off metering).
    setMeter(meter);
    return meter;
  }

  const log2 = [];
  let meterMe;

  const root = {
    async start(bundle) {
      //console.log(`vatPowers`, vatPowers);
      //console.log('bundle', bundle);
      const endowments = { require: what => 0, console, getMeter };
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
      meterUsed = false;
      try {
        meterMe(log2, mode);
      } catch (e) {
        setMeter(null);
        // console.log(`exception during meterMe`);
        log(`exception (${meter.isExhausted()})`);
        if (log2.length) {
          log(`log2: ${log2[0]}`);
        }
        return;
      } finally {
        setMeter(null);
      }
      log(`no exception`);
    },

    async refill(mode) {
      refillFacet[mode](10000000);
    },

  };
  return harden(root);
}

export default function setup(syscall, state, helpers, setMeter, transformMetering) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(syscall, state, (E, D, vatPowers) => build({E, D, vatPowers, log}), helpers.vatID, setMeter, transformMetering);
}
