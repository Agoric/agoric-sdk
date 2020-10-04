import { assert } from '@agoric/assert';
import { assertKnownOptions } from '../../assertOptions';
import { makeLocalVatManagerFactory } from './localVatManager';
import { makeNodeWorkerVatManagerFactory } from './nodeWorker';
import { makeNodeSubprocessFactory } from './worker-subprocess-node';

export function makeVatManagerFactory({
  allVatPowers,
  kernelKeeper,
  vatEndowments,
  meterManager,
  transformMetering,
  waitUntilQuiescent,
  makeNodeWorker,
  startSubprocessWorkerNode,
  startSubprocessWorkerXS,
}) {
  const localFactory = makeLocalVatManagerFactory({
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    meterManager,
    transformMetering,
    waitUntilQuiescent,
  });

  const nodeWorkerFactory = makeNodeWorkerVatManagerFactory({
    makeNodeWorker,
    kernelKeeper,
    testLog: allVatPowers.testLog,
  });

  const nodeSubprocessFactory = makeNodeSubprocessFactory({
    startSubprocessWorker: startSubprocessWorkerNode,
    kernelKeeper,
    testLog: allVatPowers.testLog,
  });

  const xsWorkerFactory = makeNodeSubprocessFactory({
    startSubprocessWorker: startSubprocessWorkerXS,
    kernelKeeper,
    testLog: allVatPowers.testLog,
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
      if (!startSubprocessWorkerXS) {
        throw new Error('manager type xs-worker not available');
      }
      return xsWorkerFactory.createFromBundle(vatID, bundle, managerOptions);
    }

    throw Error(
      `unknown type ${managerType}, not local/nodeWorker/node-subprocess`,
    );
  }

  return harden(vatManagerFactory);
}
