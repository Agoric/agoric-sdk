// this file is loaded at the start of a new subprocess
import '@agoric/install-ses';

import anylogger from 'anylogger';
import fs from 'fs';

import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeMarshal } from '@agoric/marshal';
import { WeakRef, FinalizationRegistry } from '../../weakref';
import { arrayEncoderStream, arrayDecoderStream } from '../../worker-protocol';
import {
  netstringEncoderStream,
  netstringDecoderStream,
} from '../../netstring';
import { waitUntilQuiescent } from '../../waitUntilQuiescent';
import { makeLiveSlots } from '../liveSlots';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
} from './supervisor-helper';

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.error(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

let dispatch;

const toParent = arrayEncoderStream();
toParent
  .pipe(netstringEncoderStream())
  .pipe(fs.createWriteStream('IGNORED', { fd: 4, encoding: 'utf-8' }));

const fromParent = fs
  .createReadStream('IGNORED', { fd: 3, encoding: 'utf-8' })
  .pipe(netstringDecoderStream())
  .pipe(arrayDecoderStream());

function sendUplink(msg) {
  assert(msg instanceof Array, X`msg must be an Array`);
  toParent.write(msg);
}

// fromParent.on('data', data => {
//  workerLog('data from parent', data);
//  toParent.write('child ack');
// });

fromParent.on('data', ([type, ...margs]) => {
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
    ] = margs;

    function testLog(...args) {
      sendUplink(['testLog', ...args]);
    }

    // syscallToManager can throw or return OK/ERR
    function syscallToManager(vatSyscallObject) {
      sendUplink(['syscall', vatSyscallObject]);
    }
    // this 'syscall' throws or returns data
    const syscall = makeSupervisorSyscall(syscallToManager, false);
    const vatID = 'demo-vatID';
    // todo: maybe add transformTildot, makeGetMeter/transformMetering to
    // vatPowers, but only if options tell us they're wanted. Maybe
    // transformTildot should be async and outsourced to the kernel
    // process/thread.
    const vatPowers = {
      makeMarshal,
      testLog,
    };
    const gcTools = harden({
      WeakRef,
      FinalizationRegistry,
      waitUntilQuiescent,
    });
    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      gcTools,
    );

    const endowments = {
      ...ls.vatGlobals,
      console: makeConsole(`SwingSet:vatWorker`),
      assert,
    };

    importBundle(bundle, { endowments }).then(vatNS => {
      workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
      sendUplink(['gotBundle']);
      ls.setBuildRootObject(vatNS.buildRootObject);
      dispatch = makeSupervisorDispatch(ls.dispatch, waitUntilQuiescent);
      workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
      sendUplink(['dispatchReady']);
    });
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
