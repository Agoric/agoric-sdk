/* global harden */
import { assert } from '@agoric/assert';
import { assertKnownOptions } from '../../assertOptions';
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

  function validateManagerOptions(managerOptions) {
    assertKnownOptions(managerOptions, [
      'enablePipelining',
      'managerType',
      'setup',
      'bundle',
      'metered',
      'enableSetup',
      'enableInternalMetering',
      'notifyTermination',
      'vatParameters',
    ]);
    const {
      setup,
      bundle,
      enableSetup = false,
      metered = false,
      notifyTermination,
    } = managerOptions;
    assert(setup || bundle);
    assert(
      !bundle || typeof bundle === 'object',
      `bundle must be object, not a plain string`,
    );
    assert(!(setup && !enableSetup), `setup() provided, but not enabled`); // todo maybe useless
    assert(
      !(notifyTermination && !metered),
      `notifyTermination is currently useless without metered:true`,
    ); // explicit termination will change that
  }

  // returns promise for new vatManager
  function vatManagerFactory(vatID, managerOptions) {
    validateManagerOptions(managerOptions);
    const { managerType = 'local', setup, bundle } = managerOptions;

    if (managerType === 'local') {
      if (setup) {
        return localFactory.createFromSetup(vatID, setup, managerOptions);
      }
      return localFactory.createFromBundle(vatID, bundle, managerOptions);
    }

    if (managerType === 'nodeWorker') {
      // 'setup' based vats must be local. TODO: stop using 'setup' in vats,
      // but tests and comms-vat still need it
      assert(!setup, `setup()-based vats must use a local Manager`);
      return nodeWorkerFactory.createFromBundle(vatID, bundle, managerOptions);
    }

    throw Error(
      `unknown manager type ${managerType}, not 'local' or 'nodeWorker'`,
    );
  }

  return harden(vatManagerFactory);
}
