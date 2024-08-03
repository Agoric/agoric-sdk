/* global globalThis */

import { assert, Fail } from '@endo/errors';
import { importBundle } from '@endo/import-bundle';
import { makeLiveSlots } from '@agoric/swingset-liveslots';
import { makeManagerKit } from './manager-helper.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from '../../supervisors/supervisor-helper.js';

export function makeLocalVatManagerFactory({
  allVatPowers,
  vatEndowments,
  gcTools,
}) {
  const { testLog } = allVatPowers; // used by unit tests

  function prepare(managerOptions) {
    const { retainSyscall = false } = managerOptions;
    const mk = makeManagerKit(retainSyscall);

    function finish(dispatch) {
      assert.typeof(dispatch, 'function');
      // this 'deliverToWorker' never throws, even if liveslots has an internal error
      mk.setDeliverToWorker(makeSupervisorDispatch(dispatch));

      async function shutdown() {
        // local workers don't need anything special to shut down between turns
      }

      return mk.getManager(shutdown);
    }
    const syscall = makeSupervisorSyscall(mk.syscallFromWorker);
    return { syscall, finish };
  }

  function createFromSetup(vatID, managerOptions) {
    const { setup } = managerOptions;
    assert.typeof(setup, 'function', 'setup is not an in-realm function');

    const { syscall, finish } = prepare(managerOptions);
    const helpers = harden({}); // DEPRECATED, todo remove from setup()
    const state = null; // TODO remove from setup()
    const vatPowers = harden({ testLog });

    const dispatch = setup(syscall, state, helpers, vatPowers);
    return finish(dispatch);
  }

  async function createFromBundle(
    vatID,
    bundle,
    managerOptions,
    liveSlotsOptions,
  ) {
    const { enableSetup = false, sourcedConsole } = managerOptions;
    assert(sourcedConsole, 'vats need managerOptions.sourcedConsole');

    const { syscall, finish } = prepare(managerOptions);

    const vatPowers = harden({ testLog });

    const makeLogMaker = source => {
      const makeLog = level => {
        const log = sourcedConsole[level];
        typeof log === 'function' || Fail`logger[${level}] must be a function`;
        return log.bind(sourcedConsole, source);
      };
      return makeLog;
    };

    const workerEndowments = harden({
      ...vatEndowments,
      console: makeVatConsole(makeLogMaker('vat')),
      // See https://github.com/Agoric/agoric-sdk/issues/9515
      assert: globalThis.assert,
      TextEncoder,
      TextDecoder,
      Base64: globalThis.Base64, // Available only on XSnap
      URL: globalThis.URL, // Unavailable only on XSnap
    });

    async function buildVatNamespace(
      lsEndowments,
      inescapableGlobalProperties,
    ) {
      const vatNS = await importBundle(bundle, {
        filePrefix: `vat-${vatID}/...`,
        endowments: { ...workerEndowments, ...lsEndowments },
        inescapableGlobalProperties,
      });
      return vatNS;
    }

    await null;
    if (enableSetup) {
      const vatNS = await buildVatNamespace({}, {});
      const setup = vatNS.default;
      setup || Fail`vat source bundle lacks (default) setup() function`;
      assert.typeof(setup, 'function');
      const helpers = harden({}); // DEPRECATED, todo remove from setup()
      const state = null; // TODO remove from setup()
      const dispatch = setup(syscall, state, helpers, vatPowers);
      return finish(dispatch);
    } else {
      const ls = makeLiveSlots(
        syscall,
        vatID,
        vatPowers,
        liveSlotsOptions,
        gcTools,
        makeVatConsole(makeLogMaker('ls')),
        buildVatNamespace,
      );
      assert(ls.dispatch);
      return finish(ls.dispatch);
    }
  }

  const localVatManagerFactory = harden({
    createFromBundle,
    createFromSetup,
  });
  return localVatManagerFactory;
}
