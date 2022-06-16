// @ts-check
/* global WeakRef, FinalizationRegistry */
// this file is loaded at the start of a new Worker, which makes it a new JS
// environment (with it's own Realm), so we must install-ses too.
import '@endo/init';
import { parentPort } from 'worker_threads';
import anylogger from 'anylogger';

import '../../types-ambient.js';
import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@endo/import-bundle';
import { makeMarshal } from '@endo/marshal';
import engineGC from '../../lib-nodejs/engine-gc.js';
import { makeGcAndFinalize } from '../../lib-nodejs/gc-and-finalize.js';
import { waitUntilQuiescent } from '../../lib-nodejs/waitUntilQuiescent.js';
import { makeDummyMeterControl } from '../../kernel/dummyMeterControl.js';
import { makeLiveSlots } from '../../liveslots/liveslots.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from '../supervisor-helper.js';

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
      virtualObjectCacheSize,
      enableDisavow,
      relaxDurabilityRules,
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
          log(...args);
        };
      };
      return makeLog;
    };

    const workerEndowments = {
      console: makeVatConsole(makeLogMaker(`SwingSet:vat:${vatID}`)),
      assert,
    };

    async function buildVatNamespace(
      lsEndowments,
      inescapableGlobalProperties,
    ) {
      const vatNS = await importBundle(bundle, {
        endowments: { ...workerEndowments, ...lsEndowments },
        inescapableGlobalProperties,
      });
      workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
      return vatNS;
    }

    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      virtualObjectCacheSize,
      enableDisavow,
      gcTools,
      makeVatConsole(makeLogMaker(`SwingSet:ls:${vatID}`)),
      buildVatNamespace,
      relaxDurabilityRules,
    );

    sendUplink(['gotBundle']);
    assert(ls.dispatch);
    dispatch = makeSupervisorDispatch(ls.dispatch);
    workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
    sendUplink(['dispatchReady']);
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
