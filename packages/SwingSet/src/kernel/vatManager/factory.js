import { assert } from '@agoric/assert';
import { assertKnownOptions } from '../../assertOptions';
import { makeLocalVatManagerFactory } from './manager-local';
import { makeNodeWorkerVatManagerFactory } from './manager-nodeworker';
import { makeNodeSubprocessFactory } from './manager-subprocess-node';
import { makeXsSubprocessFactory } from './manager-subprocess-xsnap';

export function makeVatManagerFactory({
  allVatPowers,
  kernelKeeper,
  vatEndowments,
  meterManager,
  transformMetering,
  waitUntilQuiescent,
  makeNodeWorker,
  startSubprocessWorkerNode,
  startXSnap,
  gcTools,
}) {
  const localFactory = makeLocalVatManagerFactory({
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    meterManager,
    transformMetering,
    waitUntilQuiescent,
    gcTools,
  });

  const nodeWorkerFactory = makeNodeWorkerVatManagerFactory({
    makeNodeWorker,
    kernelKeeper,
    testLog: allVatPowers.testLog,
    decref: gcTools.decref,
  });

  const nodeSubprocessFactory = makeNodeSubprocessFactory({
    startSubprocessWorker: startSubprocessWorkerNode,
    kernelKeeper,
    testLog: allVatPowers.testLog,
    decref: gcTools.decref,
  });

  const xsWorkerFactory = makeXsSubprocessFactory({
    startXSnap,
    kernelKeeper,
    testLog: allVatPowers.testLog,
    decref: gcTools.decref,
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
      'virtualObjectCacheSize',
      'vatParameters',
      'vatConsole',
    ]);
    const { setup, bundle, enableSetup = false } = managerOptions;
    assert(setup || bundle);
    assert(
      !bundle || typeof bundle === 'object',
      `bundle must be object, not a plain string`,
    );
    assert(!(setup && !enableSetup), `setup() provided, but not enabled`); // todo maybe useless
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
    // 'setup' based vats must be local. TODO: stop using 'setup' in vats,
    // but tests and comms-vat still need it
    assert(!setup, `setup()-based vats must use a local Manager`);

    if (managerType === 'nodeWorker') {
      return nodeWorkerFactory.createFromBundle(vatID, bundle, managerOptions);
    }

    if (managerType === 'node-subprocess') {
      return nodeSubprocessFactory.createFromBundle(
        vatID,
        bundle,
        managerOptions,
      );
    }

    if (managerType === 'xs-worker') {
      return xsWorkerFactory.createFromBundle(vatID, bundle, managerOptions);
    }

    throw Error(
      `unknown type ${managerType}, not local/nodeWorker/node-subprocess`,
    );
  }

  return harden(vatManagerFactory);
}
