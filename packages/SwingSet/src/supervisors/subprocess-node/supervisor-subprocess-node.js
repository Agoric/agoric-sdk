// @ts-check
/* global WeakRef, FinalizationRegistry */

// this file is loaded at the start of a new subprocess
import '@endo/init';

import anylogger from 'anylogger';
import fs from 'fs';

import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@endo/import-bundle';
import { makeMarshal } from '@endo/marshal';
import engineGC from '../../lib-nodejs/engine-gc.js';
import { makeGcAndFinalize } from '../../lib-nodejs/gc-and-finalize.js';
import { makeDummyMeterControl } from '../../kernel/dummyMeterControl.js';
import {
  arrayEncoderStream,
  arrayDecoderStream,
} from '../../lib-nodejs/worker-protocol.js';
import {
  netstringEncoderStream,
  netstringDecoderStream,
} from '../../lib/netstring.js';
import { waitUntilQuiescent } from '../../lib-nodejs/waitUntilQuiescent.js';
import { makeLiveSlots } from '../../liveslots/liveslots.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from '../supervisor-helper.js';

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
    const [bundle, liveSlotsOptions] = margs;

    function testLog(...args) {
      sendUplink(['testLog', ...args]);
    }

    // syscallToManager can throw or return OK/ERR
    function syscallToManager(vatSyscallObject) {
      sendUplink(['syscall', vatSyscallObject]);
    }
    // this 'syscall' throws or returns data
    // @ts-expect-error the syscaller can return void when the second argument is false
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

    // Enable or disable the console accordingly.
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
      liveSlotsOptions,
      gcTools,
      makeVatConsole(makeLogMaker(`SwingSet:ls:${vatID}`)),
      buildVatNamespace,
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
