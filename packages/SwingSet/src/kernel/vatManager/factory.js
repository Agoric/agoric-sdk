/* global harden */
import { assert } from '@agoric/assert';
import { makeLocalVatManagerFactory } from './localVatManager';
import { makeNodeWorkerVatManagerFactory } from './nodeWorker';

export function makeVatManagerFactory({
  allVatPowers,
  kernelKeeper,
  makeVatEndowments,
  meterManager,
  transformMetering,
  waitUntilQuiescent,
  makeNodeWorker,
}) {
  const localFactory = makeLocalVatManagerFactory({
    allVatPowers,
    kernelKeeper,
    makeVatEndowments,
    meterManager,
    transformMetering,
    waitUntilQuiescent,
  });

  const nodeWorkerFactory = makeNodeWorkerVatManagerFactory({
    makeNodeWorker,
    kernelKeeper,
  });

  // returns promise for new vatManager
  function vatManagerFactory(vatID, options) {
    // options: setup|bundle, managerType, metered, notifyTermination,
    // internalMetering
    const {
      managerType = 'local',
      setup,
      bundle,
      metered = false,
      enableSetup = false,
      enableInternalMetering = false,
      notifyTermination = undefined,
    } = options || {};
    assert(setup || bundle);
    assert(
      !bundle || typeof bundle === 'object',
      `bundle must be object, not a plain string`,
    );
    assert(!(setup && !enableSetup), `setup() provided, but not enabled`); // todo maybe useless
    assert(
      !(notifyTermination && !metered),
      `notifyTermination is useless without metered:true`,
    );
    const fOpts = {
      metered,
      enableSetup,
      enableInternalMetering,
      notifyTermination,
    };

    if (managerType === 'local') {
      if (setup) {
        return localFactory.createFromSetup(vatID, setup, fOpts);
      }
      return localFactory.createFromBundle(vatID, bundle, fOpts);
    }

    if (managerType === 'nodeWorker') {
      // 'setup' based vats must be local. TODO: stop using 'setup' in vats,
      // but tests and comms-vat still need it
      assert(!setup, `setup()-based vats must use a local Manager`);
      return nodeWorkerFactory.createFromBundle(vatID, bundle, fOpts);
    }

    throw Error(
      `unknown manager type ${managerType}, not 'local' or 'nodeWorker'`,
    );
  }

  return harden(vatManagerFactory);
}
