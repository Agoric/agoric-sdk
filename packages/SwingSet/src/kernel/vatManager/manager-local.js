// @ts-check
/* global globalThis */

import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeLiveSlots } from '../liveSlots.js';
import { makeManagerKit } from './manager-helper.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from './supervisor-helper.js';

export function makeLocalVatManagerFactory(tools) {
  const {
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    gcTools,
    kernelSlog,
  } = tools;

  const baseVP = {
    makeMarshal: allVatPowers.makeMarshal,
  };
  // testLog is also a vatPower, only for unit tests

  function prepare(vatID, vatSyscallHandler, compareSyscalls, useTranscript) {
    const mk = makeManagerKit(
      vatID,
      kernelSlog,
      kernelKeeper,
      vatSyscallHandler,
      true,
      compareSyscalls,
      useTranscript,
    );

    function finish(dispatch) {
      assert.typeof(dispatch, 'function');
      // this 'deliverToWorker' never throws, even if liveslots has an internal error
      mk.setDeliverToWorker(makeSupervisorDispatch(dispatch));

      async function shutdown() {
        // local workers don't need anything special to shut down between turns
      }

      return mk.getManager(shutdown);
    }
    const syscall = makeSupervisorSyscall(mk.syscallFromWorker, true);
    return { syscall, finish };
  }

  function createFromSetup(vatID, setup, managerOptions, vatSyscallHandler) {
    assert.typeof(setup, 'function', 'setup is not an in-realm function');

    const { vatParameters, compareSyscalls, useTranscript } = managerOptions;
    const { syscall, finish } = prepare(
      vatID,
      vatSyscallHandler,
      compareSyscalls,
      useTranscript,
    );
    const { testLog } = allVatPowers;
    const helpers = harden({}); // DEPRECATED, todo remove from setup()
    const state = null; // TODO remove from setup()
    const vatPowers = harden({ ...baseVP, testLog });

    const dispatch = setup(syscall, state, helpers, vatPowers, vatParameters);
    return finish(dispatch);
  }

  async function createFromBundle(
    vatID,
    bundle,
    managerOptions,
    vatSyscallHandler,
  ) {
    const {
      consensusMode,
      enableDisavow = false,
      enableSetup = false,
      vatParameters = {},
      vatConsole,
      liveSlotsConsole,
      enableVatstore = false,
      virtualObjectCacheSize,
      compareSyscalls,
      useTranscript,
    } = managerOptions;
    assert(vatConsole, 'vats need managerOptions.vatConsole');

    const { syscall, finish } = prepare(
      vatID,
      vatSyscallHandler,
      compareSyscalls,
      useTranscript,
    );

    const vatPowers = harden({
      ...baseVP,
      vatParameters,
      testLog: allVatPowers.testLog,
    });

    const makeLogMaker = logger => {
      const makeLog = level => {
        const log = logger[level];
        assert.typeof(log, 'function', X`logger[${level}] must be a function`);
        return (...args) => {
          // We have to dynamically wrap the consensus mode so that it can change
          // during the lifetime of the supervisor (which when snapshotting, is
          // restored to its current heap across restarts, not actually stopping
          // until the vat is terminated).
          if (consensusMode) {
            return;
          }

          log(...args);
        };
      };
      return makeLog;
    };

    // we might or might not use this, depending upon whether the vat exports
    // 'buildRootObject' or a default 'setup' function
    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      enableVatstore,
      gcTools,
      makeVatConsole(makeLogMaker(liveSlotsConsole)),
    );

    const endowments = harden({
      ...vatEndowments,
      ...ls.vatGlobals,
      console: makeVatConsole(makeLogMaker(vatConsole)),
      assert,
      TextEncoder,
      TextDecoder,
      Base64: globalThis.Base64, // Available only on XSnap
      URL: globalThis.URL, // Unavailable only on XSnap
    });
    const inescapableGlobalProperties = { ...ls.inescapableGlobalProperties };

    const vatNS = await importBundle(bundle, {
      filePrefix: `vat-${vatID}/...`,
      endowments,
      inescapableGlobalProperties,
    });

    let dispatch;
    if (typeof vatNS.buildRootObject === 'function') {
      const { buildRootObject } = vatNS;
      ls.setBuildRootObject(buildRootObject);
      dispatch = ls.dispatch;
    } else if (enableSetup) {
      const setup = vatNS.default;
      assert(setup, X`vat source bundle lacks (default) setup() function`);
      assert.typeof(setup, 'function');
      const helpers = harden({}); // DEPRECATED, todo remove from setup()
      const state = null; // TODO remove from setup()
      dispatch = setup(syscall, state, helpers, vatPowers, vatParameters);
    } else {
      assert.fail(X`vat source bundle lacks buildRootObject() function`);
    }

    return finish(dispatch);
  }

  const localVatManagerFactory = harden({
    createFromBundle,
    createFromSetup,
  });
  return localVatManagerFactory;
}
