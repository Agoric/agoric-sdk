// @ts-check
// this file is loaded at the start of a new Worker, which makes it a new JS
// environment (with it's own Realm), so we must install-ses too.
import '@agoric/install-ses';
import { parentPort } from 'worker_threads';
import anylogger from 'anylogger';

import '../../types.js';
import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeMarshal } from '@agoric/marshal';
import engineGC from '../../engine-gc.js';
import { WeakRef, FinalizationRegistry } from '../../weakref.js';
import { makeGcAndFinalize } from '../../gc-and-finalize.js';
import { waitUntilQuiescent } from '../../waitUntilQuiescent.js';
import { makeDummyMeterControl } from '../dummyMeterControl.js';
import { makeLiveSlots } from '../liveSlots.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from './supervisor-helper.js';

assert(parentPort, 'parentPort somehow missing, am I not a Worker?');

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.error(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

function sendUplink(msg) {
  assert(msg instanceof Array, X`msg must be an Array`);
  assert(parentPort, 'parentPort somehow missing, am I not a Worker?');
  parentPort.postMessage(msg);
}

let dispatch;

parentPort.on('message', ([type, ...margs]) => {
  workerLog(`received`, type);
  if (type === 'start') {
    // TODO: parent should send ['start', vatID]
    workerLog(`got start`);
    sendUplink(['gotStart']);
  } else if (type === 'setBundle') {
    const [
      bundle,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      enableVatstore,
      consensusMode,
    ] = margs;

    function testLog(...args) {
      sendUplink(['testLog', ...args]);
    }

    /** @type {VatSyscaller} */
    function syscallToManager(vatSyscallObject) {
      sendUplink(['syscall', vatSyscallObject]);
      // we can't block for a result, so we always tell the vat that the
      // syscall was successful, and never has any result data
      return ['ok', null];
    }
    const syscall = makeSupervisorSyscall(syscallToManager, false);
    const vatID = 'demo-vatID';
    const vatPowers = {
      makeMarshal,
      testLog,
    };

    const gcTools = harden({
      WeakRef,
      FinalizationRegistry,
      waitUntilQuiescent,
      gcAndFinalize: makeGcAndFinalize(engineGC),
      meterControl: makeDummyMeterControl(),
    });

    const makeLogMaker = tag => {
      const logger = anylogger(tag);
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

    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      enableVatstore,
      gcTools,
      makeVatConsole(makeLogMaker(`SwingSet:ls:${vatID}`)),
    );

    const endowments = {
      ...ls.vatGlobals,
      console: makeVatConsole(makeLogMaker(`SwingSet:vat:${vatID}`)),
      assert,
    };

    const inescapableGlobalProperties = { ...ls.inescapableGlobalProperties };

    importBundle(bundle, { endowments, inescapableGlobalProperties }).then(
      vatNS => {
        workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
        sendUplink(['gotBundle']);
        ls.setBuildRootObject(vatNS.buildRootObject);
        dispatch = makeSupervisorDispatch(ls.dispatch);
        workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
        sendUplink(['dispatchReady']);
      },
    );
  } else if (type === 'deliver') {
    if (!dispatch) {
      workerLog(`error: deliver before dispatchReady`);
      return;
    }
    const [vatDeliveryObject] = margs;
    dispatch(vatDeliveryObject).then(vatDeliveryResults =>
      sendUplink(['deliverDone', vatDeliveryResults]),
    );
  } else {
    workerLog(`unrecognized downlink message ${type}`);
  }
});
