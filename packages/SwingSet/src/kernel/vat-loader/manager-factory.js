import { assert, Fail } from '@agoric/assert';
import { assertKnownOptions } from '../../lib/assertOptions.js';
import { makeLocalVatManagerFactory } from './manager-local.js';
import { makeXsSubprocessFactory } from './manager-subprocess-xsnap.js';

export function makeVatManagerFactory({
  allVatPowers,
  kernelKeeper,
  vatEndowments,
  startXSnap,
  gcTools,
  kernelSlog,
}) {
  const localFactory = makeLocalVatManagerFactory({
    allVatPowers,
    vatEndowments,
    gcTools,
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
      'reapInterval',
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
  async function vatManagerFactory(
    vatID,
    { managerOptions, liveSlotsOptions },
  ) {
    validateManagerOptions(managerOptions);
    const { workerOptions, enableSetup } = managerOptions;
    const { type } = workerOptions;

    if (type !== 'local' && 'setup' in managerOptions) {
      console.warn(`TODO: stop using setup() with ${type}`);
    }
    if (enableSetup) {
      if (managerOptions.setup) {
        return localFactory.createFromSetup(vatID, managerOptions);
      } else {
        return localFactory.createFromBundle(
          vatID,
          managerOptions.bundle,
          managerOptions,
          liveSlotsOptions,
        );
      }
    } else if (type === 'local') {
      return localFactory.createFromBundle(
        vatID,
        managerOptions.bundle,
        managerOptions,
        liveSlotsOptions,
      );
    }

    if (type === 'xsnap') {
      assert(managerOptions.bundle, 'xsnap requires Bundle');
      return xsWorkerFactory.createFromBundle(
        vatID,
        managerOptions.bundle,
        managerOptions,
        liveSlotsOptions,
      );
    }

    throw Error(`unknown type ${type}, not 'local' or 'xsnap'`);
  }

  return harden(vatManagerFactory);
}
