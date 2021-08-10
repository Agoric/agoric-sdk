// this file is loaded at the start of a new subprocess
import '@agoric/install-ses';

import anylogger from 'anylogger';
import fs from 'fs';

import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeMarshal } from '@agoric/marshal';
import engineGC from '../../engine-gc.js';
import { WeakRef, FinalizationRegistry } from '../../weakref.js';
import { makeGcAndFinalize } from '../../gc-and-finalize.js';
import { makeDummyMeterControl } from '../dummyMeterControl.js';
import {
  arrayEncoderStream,
  arrayDecoderStream,
} from '../../worker-protocol.js';
import {
  netstringEncoderStream,
  netstringDecoderStream,
} from '../../netstring.js';
import { waitUntilQuiescent } from '../../waitUntilQuiescent.js';
import { makeLiveSlots } from '../liveSlots.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from './supervisor-helper.js';

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.error(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

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
      enableVatstore,
      consensusMode,
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
    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      enableVatstore,
      gcTools,
    );

    // Enable or disable the console accordingly.
    const endowments = {
      ...ls.vatGlobals,
      console: makeVatConsole(
        anylogger(`SwingSet:vat:${vatID}`),
        (logger, args) => {
          consensusMode || logger(...args);
        },
      ),
      assert,
    };

    const inescapableGlobalProperties = { ...ls.inescapableGlobalProperties };

    importBundle(bundle, { endowments, inescapableGlobalProperties }).then(
      vatNS => {
        workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
        sendUplink(['gotBundle']);
        ls.setBuildRootObject(vatNS.buildRootObject);
        dispatch = makeSupervisorDispatch(ls.dispatch, waitUntilQuiescent);
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
