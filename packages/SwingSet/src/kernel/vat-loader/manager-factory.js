import { assert, Fail } from '@agoric/assert';
import { assertKnownOptions } from '../../lib/assertOptions.js';
import { makeLocalVatManagerFactory } from './manager-local.js';
import { makeNodeWorkerVatManagerFactory } from './manager-nodeworker.js';
import { makeNodeSubprocessFactory } from './manager-subprocess-node.js';
import { makeXsSubprocessFactory } from './manager-subprocess-xsnap.js';

export function makeVatManagerFactory({
  allVatPowers,
  kernelKeeper,
  vatEndowments,
  makeNodeWorker,
  startSubprocessWorkerNode,
  startXSnap,
  gcTools,
  defaultManagerType,
  kernelSlog,
}) {
  const localFactory = makeLocalVatManagerFactory({
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    gcTools,
    kernelSlog,
  });

  const nodeWorkerFactory = makeNodeWorkerVatManagerFactory({
    makeNodeWorker,
    kernelKeeper,
    kernelSlog,
    testLog: allVatPowers.testLog,
  });

  const nodeSubprocessFactory = makeNodeSubprocessFactory({
    startSubprocessWorker: startSubprocessWorkerNode,
    kernelKeeper,
    kernelSlog,
    testLog: allVatPowers.testLog,
  });

  const xsWorkerFactory = makeXsSubprocessFactory({
    startXSnap,
    kernelKeeper,
    kernelSlog,
    allVatPowers,
    testLog: allVatPowers.testLog,
  });

  function validateManagerOptions(managerOptions) {
    assertKnownOptions(managerOptions, [
      'enablePipelining',
      'managerType',
      'setup',
      'bundle',
      'metered',
      'enableDisavow',
      'enableSetup',
      'virtualObjectCacheSize',
      'useTranscript',
      'critical',
      'reapInterval',
      'sourcedConsole',
      'name',
      'compareSyscalls',
    ]);
    const { setup, bundle, enableSetup = false } = managerOptions;
    assert(setup || bundle);
    !bundle ||
      typeof bundle === 'object' ||
      Fail`bundle must be object, not a plain string`;
    // todo maybe useless
    !setup || enableSetup || Fail`setup() provided, but not enabled`;
  }

  // returns promise for new vatManager
  function vatManagerFactory(
    vatID,
    managerOptions,
    liveSlotsOptions,
    vatSyscallHandler,
  ) {
    validateManagerOptions(managerOptions);
    const {
      managerType = defaultManagerType,
      setup,
      bundle,
      metered,
      enableSetup,
    } = managerOptions;

    if (metered && managerType !== 'local' && managerType !== 'xs-worker') {
      console.warn(`TODO: support metered with ${managerType}`);
    }
    if (setup && managerType !== 'local') {
      console.warn(`TODO: stop using setup() with ${managerType}`);
    }
    if (enableSetup) {
      if (setup) {
        return localFactory.createFromSetup(
          vatID,
          setup,
          managerOptions,
          vatSyscallHandler,
        );
      } else {
        return localFactory.createFromBundle(
          vatID,
          bundle,
          managerOptions,
          liveSlotsOptions,
          vatSyscallHandler,
        );
      }
    } else if (managerType === 'local') {
      return localFactory.createFromBundle(
        vatID,
        bundle,
        managerOptions,
        liveSlotsOptions,
        vatSyscallHandler,
      );
    }

    if (managerType === 'nodeWorker') {
      return nodeWorkerFactory.createFromBundle(
        vatID,
        bundle,
        managerOptions,
        liveSlotsOptions,
        vatSyscallHandler,
      );
    }

    if (managerType === 'node-subprocess') {
      return nodeSubprocessFactory.createFromBundle(
        vatID,
        bundle,
        managerOptions,
        liveSlotsOptions,
        vatSyscallHandler,
      );
    }

    if (managerType === 'xs-worker') {
      return xsWorkerFactory.createFromBundle(
        vatID,
        bundle,
        managerOptions,
        liveSlotsOptions,
        vatSyscallHandler,
      );
    }

    throw Error(
      `unknown type ${managerType}, not local/nodeWorker/node-subprocess`,
    );
  }

  return harden(vatManagerFactory);
}
