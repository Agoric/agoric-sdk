import { assert, Fail } from '@endo/errors';
import { assertKnownOptions } from '../../lib/assertOptions.js';
import { makeLocalVatManagerFactory } from './manager-local.js';
import { makeNodeSubprocessFactory } from './manager-subprocess-node.js';
import { makeXsSubprocessFactory } from './manager-subprocess-xsnap.js';

export function makeVatManagerMaker({
  allVatPowers,
  kernelKeeper,
  vatEndowments,
  startSubprocessWorkerNode,
  startXSnap,
  gcTools,
  kernelSlog,
}) {
  const localFactory = makeLocalVatManagerFactory({
    allVatPowers,
    vatEndowments,
    gcTools,
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
    testLog: allVatPowers.testLog,
  });

  function validateManagerOptions(managerOptions) {
    assertKnownOptions(managerOptions, [
      'enablePipelining',
      'workerOptions',
      'setup',
      'retainSyscall',
      'bundle',
      'metered',
      'enableDisavow',
      'enableSetup',
      'useTranscript',
      'critical',
      'sourcedConsole',
      'name',
    ]);
    const { setup, bundle, enableSetup = false } = managerOptions;
    assert(setup || bundle);
    !bundle ||
      typeof bundle === 'object' ||
      Fail`bundle must be object, not a plain string`;
    // todo maybe useless
    !setup || enableSetup || Fail`setup() provided, but not enabled`;
  }

  /**
   * Asynchronously creates a VatManager around a particular type of
   * worker, with the specified vatID and options, which will invoke
   * the given syscall handler function when the worker makes a
   * syscall.
   *
   * @param {import('../../types-internal.js').VatID} vatID
   * @param {object} options
   * @param {import('../../types-internal.js').ManagerOptions} options.managerOptions
   * @param {import('@agoric/swingset-liveslots').LiveSlotsOptions} options.liveSlotsOptions
   * @returns { Promise<import('../../types-internal.js').VatManager> }
   */
  async function makeVatManager(vatID, options) {
    const { managerOptions, liveSlotsOptions } = options;
    validateManagerOptions(managerOptions);
    const { workerOptions, enableSetup } = managerOptions;
    const { type } = workerOptions;

    if (type !== 'local' && (enableSetup || 'setup' in managerOptions)) {
      console.warn(`TODO: stop using enableSetup and setup() with ${type}`);
    }

    if (enableSetup && managerOptions.setup) {
      return localFactory.createFromSetup(vatID, managerOptions);
    }

    /** @type {Pick<typeof xsWorkerFactory, 'createFromBundle'>} */
    let factory;
    if (enableSetup || type === 'local') {
      factory = localFactory;
    } else if (type === 'node-subprocess') {
      factory = nodeSubprocessFactory;
    } else if (type === 'xsnap') {
      assert(managerOptions.bundle, 'worker type xsnap requires a bundle');
      factory = xsWorkerFactory;
    } else {
      throw Error(`unknown vat worker type ${type}`);
    }

    return factory.createFromBundle(
      vatID,
      // @ts-expect-error managerOptions.bundle might be undefined
      managerOptions.bundle,
      managerOptions,
      liveSlotsOptions,
    );
  }

  return harden(makeVatManager);
}
