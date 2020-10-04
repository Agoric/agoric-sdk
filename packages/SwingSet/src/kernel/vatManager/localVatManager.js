import { assert } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeLiveSlots } from '../liveSlots';
import { createSyscall } from './syscall';
import { makeDeliver } from './deliver';
import { makeTranscriptManager } from './transcript';

export function makeLocalVatManagerFactory(tools) {
  const {
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    meterManager,
    transformMetering,
    waitUntilQuiescent,
  } = tools;

  const { makeGetMeter, refillAllMeters, stopGlobalMeter } = meterManager;
  const baseVP = {
    Remotable: allVatPowers.Remotable,
    getInterfaceOf: allVatPowers.getInterfaceOf,
    makeMarshal: allVatPowers.makeMarshal,
    transformTildot: allVatPowers.transformTildot,
  };
  const internalMeteringVP = {
    makeGetMeter: allVatPowers.makeGetMeter,
    transformMetering: allVatPowers.transformMetering,
  };
  // testLog is also a vatPower, only for unit tests

  function prepare(vatID) {
    const vatKeeper = kernelKeeper.getVatKeeper(vatID);
    const transcriptManager = makeTranscriptManager(
      kernelKeeper,
      vatKeeper,
      vatID,
    );
    const { syscall, setVatSyscallHandler } = createSyscall(transcriptManager);
    function finish(dispatch, meterRecord) {
      assert(
        dispatch && dispatch.deliver,
        `vat failed to return a 'dispatch' with .deliver: ${dispatch}`,
      );
      const { deliver, replayTranscript } = makeDeliver(
        {
          vatID,
          stopGlobalMeter,
          meterRecord,
          refillAllMeters,
          transcriptManager,
          vatKeeper,
          waitUntilQuiescent,
        },
        dispatch,
      );

      async function shutdown() {
        // local workers don't need anything special to shut down between turns
      }

      const manager = harden({
        replayTranscript,
        setVatSyscallHandler,
        deliver,
        shutdown,
      });
      return manager;
    }
    return { syscall, finish };
  }

  function createFromSetup(vatID, setup, managerOptions) {
    assert(!managerOptions.metered, `unsupported`);
    assert(!managerOptions.enableInternalMetering, `unsupported`);
    assert(setup instanceof Function, 'setup is not an in-realm function');
    const { syscall, finish } = prepare(vatID, managerOptions);

    const { vatParameters } = managerOptions;
    const { testLog } = allVatPowers;
    const helpers = harden({}); // DEPRECATED, todo remove from setup()
    const state = null; // TODO remove from setup()
    const vatPowers = harden({ ...baseVP, vatParameters, testLog });
    const dispatch = setup(syscall, state, helpers, vatPowers);
    const meterRecord = null;
    const manager = finish(dispatch, meterRecord);
    return manager;
  }

  async function createFromBundle(vatID, bundle, managerOptions) {
    const {
      metered = false,
      enableSetup = false,
      enableInternalMetering = false,
      vatParameters = {},
      vatConsole,
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

    const inescapableTransforms = [];
    const inescapableGlobalLexicals = {};
    if (metered) {
      const getMeter = meterRecord.getMeter;
      inescapableTransforms.push(src => transformMetering(src, getMeter));
      inescapableGlobalLexicals.getMeter = getMeter;
    }

    const vatNS = await importBundle(bundle, {
      filePrefix: vatID,
      endowments: harden({ ...vatEndowments, console: vatConsole }),
      inescapableTransforms,
      inescapableGlobalLexicals,
    });

    const { syscall, finish } = prepare(vatID, managerOptions);
    const imVP = enableInternalMetering ? internalMeteringVP : {};
    const vatPowers = harden({
      ...baseVP,
      ...imVP,
      vatParameters,
      testLog: allVatPowers.testLog,
    });
    const state = null; // TODO remove from makeLiveSlots()

    let dispatch;
    if (typeof vatNS.buildRootObject === 'function') {
      const { buildRootObject } = vatNS;
      dispatch = makeLiveSlots(
        syscall,
        state,
        buildRootObject,
        vatID,
        vatPowers,
        vatParameters,
      );
    } else if (enableSetup) {
      const setup = vatNS.default;
      assert(setup, `vat source bundle lacks (default) setup() function`);
      assert(
        setup instanceof Function,
        `vat source bundle default export is not a function`,
      );
      const helpers = harden({}); // DEPRECATED, todo remove from setup()
      dispatch = setup(syscall, state, helpers, vatPowers);
    } else {
      throw Error(`vat source bundle lacks buildRootObject() function`);
    }

    const manager = finish(dispatch, meterRecord);
    return manager;
  }

  const localVatManagerFactory = harden({
    createFromBundle,
    createFromSetup,
  });
  return localVatManagerFactory;
}
