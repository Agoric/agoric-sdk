import { makeMeter } from '@agoric/transform-metering';

export function makeMeterManager(replaceGlobalMeter) {
  // It is important that tameMetering() was called by application startup,
  // before install-ses. We expect the controller to run tameMetering() again
  // (and rely upon its only-once behavior) to get the control facet
  // (replaceGlobalMeter), and pass it to us through kernelEndowments.

  // TODO: be more clever. Only refill meters that were touched. Use a
  // WeakMap. Drop meters that vats forget. Minimize the fast path. Then wrap
  // more (encapsulate importBundle?) and provide a single sensible thing to
  // vats.
  let complainedAboutGlobalMetering = false;
  const allRefillers = new Set(); // refill() functions

  function makeGetMeter(options = {}) {
    const { refillEachCrank = true, refillIfExhausted = true } = options;

    if (!replaceGlobalMeter && !complainedAboutGlobalMetering) {
      console.error(
        `note: makeGetMeter() cannot enable global metering, app must import @agoric/install-metering-and-ses`,
      );
      // to fix this, your application program must
      // `import('@agoric/install-metering-and-ses')` instead of
      // `import('@agoric/install-ses')`
      complainedAboutGlobalMetering = true;
    }

    // zoe's importBundle(dapp-encouragement contract) causes babel to use
    // about 5.4M computrons and 6.4M allocatrons (total 11.8M) in a single
    // crank, so the default of 1e7 is insufficient
    const FULL = 1e8;
    const { meter, refillFacet } = makeMeter({
      budgetAllocate: FULL,
      budgetCompute: FULL,
    });

    function refill() {
      // console.error(`-- METER REFILL`);
      // console.error(`   allocate used: ${FULL - refillFacet.getAllocateBalance()}`);
      // console.error(`   compute used : ${FULL - refillFacet.getComputeBalance()}`);
      const meterUsage = harden({
        // TODO: Change this meterType whenever the semantics change.
        meterType: 'tame-metering-1',
        allocate: FULL - refillFacet.getAllocateBalance(),
        compute: FULL - refillFacet.getComputeBalance(),
      });
      if (meter.isExhausted() && !refillIfExhausted) {
        return meterUsage;
      }
      refillFacet.allocate();
      refillFacet.compute();
      refillFacet.stack();
      return meterUsage;
    }

    if (refillEachCrank) {
      allRefillers.add(refill);
    }

    function getMeter(dontReplaceGlobalMeter = false) {
      if (replaceGlobalMeter && !dontReplaceGlobalMeter) {
        replaceGlobalMeter(meter);
      }
      return meter;
    }

    function isExhausted() {
      return meter.isExhausted();
    }

    // TODO: this will evolve. For now, we let the caller refill the meter as
    // much as they want, although only tests will do this (normal vats will
    // just rely on refillEachCrank). As this matures, vats will only be able
    // to refill a meter by transferring credits from some other meter, so
    // their total usage limit remains unchanged.
    return harden({
      getMeter,
      isExhausted,
      refillFacet,
      refill,
      getAllocateBalance: refillFacet.getAllocateBalance,
      getComputeBalance: refillFacet.getComputeBalance,
      getCombinedBalance: refillFacet.getCombinedBalance,
    });
  }

  function stopGlobalMeter() {
    if (replaceGlobalMeter) {
      replaceGlobalMeter(null);
    }
  }

  function refillAllMeters() {
    for (const refiller of allRefillers) {
      refiller();
    }
  }

  function runWithoutGlobalMeter(f, ...args) {
    if (!replaceGlobalMeter) {
      return f(...args);
    }
    const oldMeter = replaceGlobalMeter(null);
    try {
      return f(...args);
    } finally {
      replaceGlobalMeter(oldMeter);
    }
  }

  return harden({
    makeGetMeter,
    stopGlobalMeter,
    refillAllMeters,
    runWithoutGlobalMeter,
  });
}
