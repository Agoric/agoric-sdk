// @ts-check
import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeLiveSlots } from '../liveSlots.js';
import { makeManagerKit } from './manager-helper.js';
import {
  makeSupervisorDispatch,
  makeMeteredDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from './supervisor-helper.js';

export function makeLocalVatManagerFactory(tools) {
  const {
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    meterManager,
    transformMetering,
    gcTools,
    kernelSlog,
  } = tools;

  const { makeGetMeter, refillAllMeters, stopGlobalMeter } = meterManager;
  const baseVP = {
    makeMarshal: allVatPowers.makeMarshal,
  };
  // testLog is also a vatPower, only for unit tests

  function prepare(
    vatID,
    vatSyscallHandler,
    meterRecord,
    compareSyscalls,
    useTranscript,
  ) {
    const mtools = harden({ stopGlobalMeter, meterRecord, refillAllMeters });
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
      const deliverToWorker = makeMeteredDispatch(
        makeSupervisorDispatch(dispatch),
        mtools,
      );
      mk.setDeliverToWorker(deliverToWorker);

      async function shutdown() {
        // local workers don't need anything special to shut down between turns
      }

      return mk.getManager(shutdown);
    }
    const syscall = makeSupervisorSyscall(mk.syscallFromWorker, true);
    return { syscall, finish };
  }

  function createFromSetup(vatID, setup, managerOptions, vatSyscallHandler) {
    assert(!managerOptions.metered, X`unsupported`);
    assert(setup instanceof Function, 'setup is not an in-realm function');

    const { vatParameters, compareSyscalls, useTranscript } = managerOptions;
    const { syscall, finish } = prepare(
      vatID,
      vatSyscallHandler,
      null,
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
      metered = false,
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

    let meterRecord = null;
    if (metered) {
      // fail-stop: we refill the meter after each crank (in vatManager
      // doProcess()), but if the vat exhausts its meter within a single
      // crank, it will never run again. We set refillEachCrank:false because
      // we want doProcess to do the refilling itself, so it can count the
      // usage
      meterRecord = makeGetMeter({
        refillEachCrank: false,
        refillIfExhausted: false,
      });
    }

    const { syscall, finish } = prepare(
      vatID,
      vatSyscallHandler,
      meterRecord,
      compareSyscalls,
      useTranscript,
    );

    const vatPowers = harden({
      ...baseVP,
      vatParameters,
      testLog: allVatPowers.testLog,
    });

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
      liveSlotsConsole,
    );

    const endowments = harden({
      ...vatEndowments,
      ...ls.vatGlobals,
      console: makeVatConsole(vatConsole, (logger, args) => {
        consensusMode || logger(...args);
      }),
      assert,
    });
    const inescapableTransforms = [];
    const inescapableGlobalProperties = { ...ls.inescapableGlobalProperties };
    const inescapableGlobalLexicals = {};
    if (metered) {
      const getMeter = meterRecord.getMeter;
      inescapableTransforms.push(src => transformMetering(src, getMeter));
      inescapableGlobalLexicals.getMeter = getMeter;
    }

    const vatNS = await importBundle(bundle, {
      filePrefix: `vat-${vatID}/...`,
      endowments,
      inescapableTransforms,
      inescapableGlobalLexicals,
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
