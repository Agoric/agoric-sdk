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

  /**
   * returns promise for new vatManager
   *
   * @param {import('../../types-internal.js').VatID} vatID
   * @param {import('../../types-internal.js').ManagerOptions} managerOptions
   * @param {import('@agoric/swingset-liveslots').LiveSlotsOptions} liveSlotsOptions
   * @param {import('../vat-warehouse.js').VatSyscallHandler} vatSyscallHandler
   * @returns { Promise<import('../../types-internal.js').VatManager> }
   */
  async function vatManagerFactory(
    vatID,
    managerOptions,
    liveSlotsOptions,
    vatSyscallHandler,
  ) {
    validateManagerOptions(managerOptions);
    const {
      managerType = defaultManagerType,
      metered,
      enableSetup,
    } = managerOptions;

    if (metered && managerType !== 'local' && managerType !== 'xs-worker') {
      console.warn(`TODO: support metered with ${managerType}`);
    }
    if (managerType !== 'local' && 'setup' in managerOptions) {
      console.warn(`TODO: stop using setup() with ${managerType}`);
    }
    if (enableSetup) {
      if (managerOptions.setup) {
        return localFactory.createFromSetup(
          vatID,
          managerOptions.setup,
          managerOptions,
          vatSyscallHandler,
        );
      } else {
        return localFactory.createFromBundle(
          vatID,
          managerOptions.bundle,
          managerOptions,
          liveSlotsOptions,
          vatSyscallHandler,
        );
      }
    } else if (managerType === 'local') {
      return localFactory.createFromBundle(
        vatID,
        managerOptions.bundle,
        managerOptions,
        liveSlotsOptions,
        vatSyscallHandler,
      );
    }

    if (managerType === 'xs-worker') {
      assert(managerOptions.bundle, 'xsnap requires Bundle');
      return xsWorkerFactory.createFromBundle(
        vatID,
        managerOptions.bundle,
        managerOptions,
        liveSlotsOptions,
        vatSyscallHandler,
      );
    }

    throw Error(`unknown type ${managerType}, not 'local' or 'xs-worker'`);
  }

  return harden(vatManagerFactory);
}
