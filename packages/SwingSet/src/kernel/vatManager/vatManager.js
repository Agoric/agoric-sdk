/* global harden */

import { importBundle } from '@agoric/import-bundle';
import { makeLiveSlots } from '../liveSlots';
import { createSyscall } from './syscall';
import { makeDeliver } from './deliver';
import { makeTranscriptManager } from './transcript';

export function makeVatManagerFactory(tools) {
  const {
    dynamicVatPowers,
    kernelKeeper,
    makeVatEndowments,
    meterManager,
    staticVatPowers,
    transformMetering,
    waitUntilQuiescent,
  } = tools;

  const { makeGetMeter, refillAllMeters, stopGlobalMeter } = meterManager;

  async function createFromSetup(
    setup,
    vatID,
    vatPowers = staticVatPowers,
    meterRecord = null,
    notifyTermination = undefined,
  ) {
    if (!(setup instanceof Function)) {
      throw Error('setup is not an in-realm function');
    }
    const helpers = harden({}); // DEPRECATED, todo remove from setup()

    const vatKeeper = kernelKeeper.allocateVatKeeperIfNeeded(vatID);

    const transcriptManager = makeTranscriptManager(
      kernelKeeper,
      vatKeeper,
      vatID,
    );
    const { syscall, setVatSyscallHandler } = createSyscall(transcriptManager);

    // now build the runtime, which gives us back a dispatch function
    // TODO: meter the initial creation; survive a top-level infinite loop
    const state = null; // TODO remove from setup()
    const dispatch = setup(syscall, state, helpers, vatPowers);
    if (!dispatch || dispatch.deliver === undefined) {
      throw new Error(
        `vat setup() failed to return a 'dispatch' with .deliver: ${dispatch}`,
      );
    }

    const { deliver, replayTranscript } = makeDeliver(
      {
        vatID,
        stopGlobalMeter,
        notifyTermination,
        meterRecord,
        refillAllMeters,
        transcriptManager,
        vatKeeper,
        waitUntilQuiescent,
      },
      dispatch,
    );

    const manager = harden({
      replayTranscript,
      setVatSyscallHandler,
      deliver,
    });
    return manager;
  }

  async function createFromBundle(bundle, vatID, options) {
    const {
      allowSetup = false,
      metered = false,
      notifyTermination = undefined,
      vatPowerType, // 'static' or 'dynamic'
      ...unknownOptions
    } = options;
    if (Object.keys(unknownOptions).length) {
      const msg = JSON.stringify(Object.keys(unknownOptions));
      throw Error(`vatManager.createFromBundle unknown options ${msg}`);
    }
    if (notifyTermination && !metered) {
      throw Error(`notifyTermination is useless without metered:true`);
    }
    if (typeof bundle !== 'object') {
      throw Error(`createFromBundle() requires bundle, not a plain string`);
    }

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
      endowments: makeVatEndowments(vatID),
      inescapableTransforms,
      inescapableGlobalLexicals,
    });

    let setup;
    if (typeof vatNS.buildRootObject === 'function') {
      setup = (syscall, state, helpers, vP) =>
        makeLiveSlots(syscall, state, vatNS.buildRootObject, vatID, vP);
    } else {
      if (!allowSetup) {
        throw Error(
          `vat source bundle does not export buildRootObject function`,
        );
      }
      setup = vatNS.default;
    }
    if (!(setup instanceof Function)) {
      throw Error('setup is not an in-realm function');
    }

    const vatPowers =
      vatPowerType === 'static' ? staticVatPowers : dynamicVatPowers;

    return createFromSetup(
      setup,
      vatID,
      vatPowers,
      meterRecord,
      notifyTermination,
    );
  }

  const vatManagerFactory = harden({
    createFromBundle,
    createFromSetup,
  });
  return vatManagerFactory;
}
