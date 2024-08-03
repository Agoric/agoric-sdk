/* global globalThis WeakRef FinalizationRegistry */
import { assert, Fail } from '@endo/errors';
import { importBundle } from '@endo/import-bundle';
import {
  makeLiveSlots,
  insistVatDeliveryObject,
  insistVatSyscallResult,
} from '@agoric/swingset-liveslots';
// import '../../types-ambient.js';
// grumble... waitUntilQuiescent is exported and closes over ambient authority
import { waitUntilQuiescent } from './waitUntilQuiescent.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';

import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from './supervisor-helper.js';

/**
 * @import {VatDeliveryObject} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryResult} from '@agoric/swingset-liveslots'
 * @import {VatSyscallObject} from '@agoric/swingset-liveslots'
 * @import {VatSyscallResult} from '@agoric/swingset-liveslots'
 * @import {VatSyscallHandler} from '@agoric/swingset-liveslots'
 * @import {LiveSlotsOptions} from '@agoric/swingset-liveslots'
 * @import {MeterControl} from '@agoric/swingset-liveslots'
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.log(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

function makeMeterControl() {
  let meteringDisabled = 0;

  function isMeteringDisabled() {
    return !!meteringDisabled;
  }

  function assertIsMetered(msg) {
    assert(!meteringDisabled, msg);
  }
  function assertNotMetered(msg) {
    assert(!!meteringDisabled, msg);
  }

  function runWithoutMetering(thunk) {
    const limit = globalThis.currentMeterLimit();
    const before = globalThis.resetMeter(0, 0);
    meteringDisabled += 1;
    try {
      return thunk();
    } finally {
      globalThis.resetMeter(limit, before);
      meteringDisabled -= 1;
    }
  }

  async function runWithoutMeteringAsync(thunk) {
    const limit = globalThis.currentMeterLimit();
    const before = globalThis.resetMeter(0, 0);
    meteringDisabled += 1;
    return Promise.resolve()
      .then(() => thunk())
      .finally(() => {
        globalThis.resetMeter(limit, before);
        meteringDisabled -= 1;
      });
  }

  // return a version of f that runs outside metering
  function unmetered(f) {
    function wrapped(...args) {
      return runWithoutMetering(() => f(...args));
    }
    return harden(wrapped);
  }

  /** @type { MeterControl } */
  const meterControl = {
    isMeteringDisabled,
    assertIsMetered,
    assertNotMetered,
    runWithoutMetering,
    runWithoutMeteringAsync,
    unmetered,
  };
  return harden(meterControl);
}

const meterControl = makeMeterControl();

/**
 * Wrap byte-level protocols with tagged array codec.
 *
 * @param {(cmd: ArrayBuffer) => ArrayBuffer} issueCommand as from xsnap
 * @typedef { [unknown, ...unknown[]] } Tagged tagged array
 */
function managerPort(issueCommand) {
  /** @type { (item: Tagged) => ArrayBuffer } */
  const encode = item => {
    let txt;
    try {
      txt = JSON.stringify(item);
    } catch (nope) {
      workerLog(nope.message, item);
      throw nope;
    }
    return encoder.encode(txt).buffer;
  };

  /** @type { (msg: ArrayBuffer) => any } */
  const decodeData = msg => JSON.parse(decoder.decode(msg) || 'null');

  /** @type { (msg: ArrayBuffer) => Tagged } */
  function decode(msg) {
    /** @type { Tagged } */
    const item = decodeData(msg);
    Array.isArray(item) || Fail`expected array`;
    item.length > 0 || Fail`empty array lacks tag`;
    return item;
  }

  return harden({
    /** @type { (item: Tagged) => void } */
    send: item => {
      issueCommand(encode(item));
    },
    /** @type { (item: Tagged) => unknown } */
    call: item => decodeData(issueCommand(encode(item))),

    /**
     * Wrap an async Tagged handler in the xsnap async reporting idiom.
     *
     * @param {(item: Tagged) => Promise<Tagged>} f async Tagged handler
     * @returns {(msg: ArrayBuffer) => Report<ArrayBuffer>} xsnap style handleCommand
     *
     * @typedef { { result?: T } } Report<T> report T when idle
     * @template T
     */
    handlerFrom(f) {
      const lastResort = encoder.encode(`exception from ${f.name}`).buffer;
      return msg => {
        const report = {};
        f(decode(msg))
          .then(item => {
            workerLog('result', item);
            report.result = encode(item);
          })
          .catch(err => {
            report.result = encode(['err', err.name, err.message]);
          })
          .catch(_err => {
            report.result = lastResort;
          });
        return report;
      };
    },
  });
}

// please excuse copy-and-paste from kernel.js
function abbreviateReplacer(_, arg) {
  if (typeof arg === 'bigint') {
    // since testLog is only for testing, 2^53 is enough.
    // precedent: 32a1dd3
    return Number(arg);
  }
  if (typeof arg === 'string' && arg.length >= 40) {
    // truncate long strings
    return `${arg.slice(0, 15)}...${arg.slice(arg.length - 15)}`;
  }
  return arg;
}

/**
 * @param {ReturnType<typeof managerPort>} port
 */
function makeWorker(port) {
  /** @type { ((delivery: VatDeliveryObject) => Promise<VatDeliveryResult>) | null } */
  let dispatch = null;

  /**
   * @param {unknown} vatID
   * @param {unknown} bundle
   * @param {LiveSlotsOptions} liveSlotsOptions
   * @returns {Promise<Tagged>}
   */
  async function setBundle(vatID, bundle, liveSlotsOptions) {
    /** @type { VatSyscallHandler } */
    function syscallToManager(vatSyscallObject) {
      workerLog('doSyscall', vatSyscallObject);
      const result = port.call(['syscall', vatSyscallObject]);
      workerLog(' ... syscall result:', result);
      insistVatSyscallResult(result);
      return result;
    }

    const syscall = makeSupervisorSyscall(syscallToManager);

    const vatPowers = {
      testLog: (...args) =>
        port.send([
          'testLog',
          ...args.map(arg =>
            typeof arg === 'string'
              ? arg
              : JSON.stringify(arg, abbreviateReplacer),
          ),
        ]),
    };

    const gcTools = harden({
      WeakRef,
      FinalizationRegistry,
      waitUntilQuiescent,
      gcAndFinalize: makeGcAndFinalize(globalThis.gc),
      meterControl,
    });

    /** @param {string} source */
    const makeLogMaker = source => {
      /** @param {string} level */
      const makeLog = level => {
        // Capture the `console.log`, etc.'s `printAll` function.
        const printAll = console[level];
        assert.typeof(printAll, 'function');
        const portSendingPrinter = (...args) => {
          port.send(['sourcedConsole', source, level, ...args]);
        };
        return (...args) => {
          // Use the causal console, but output to the port.
          //
          // FIXME: This is a hack until the start compartment can create
          // Console objects that log to a different destination than
          // `globalThis.console`.
          const { print: savePrinter } = globalThis;
          try {
            globalThis.print = portSendingPrinter;
            printAll(...args);
          } finally {
            globalThis.print = savePrinter;
          }
        };
      };
      return makeLog;
    };

    const workerEndowments = {
      console: makeVatConsole(makeLogMaker('vat')),
      // See https://github.com/Agoric/agoric-sdk/issues/9515
      assert: globalThis.assert,
      // bootstrap provides HandledPromise
      HandledPromise: globalThis.HandledPromise,
      TextEncoder,
      TextDecoder,
      Base64: globalThis.Base64, // Present only in XSnap
    };

    async function buildVatNamespace(
      lsEndowments,
      inescapableGlobalProperties,
    ) {
      assert(bundle, 'bundle undefined (duplicate buildVatNamespace call?)');
      const vatNS = await importBundle(bundle, {
        endowments: { ...workerEndowments, ...lsEndowments },
        inescapableGlobalProperties,
      });
      bundle = undefined; // overwrite to allow GC to discard big string
      workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
      return vatNS;
    }

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
    dispatch = makeSupervisorDispatch(ls.dispatch);
    workerLog(`got dispatch`);
    return ['dispatchReady'];
  }

  /** @type { (item: Tagged) => Promise<Tagged> } */
  async function handleItem([tag, ...args]) {
    workerLog('handleItem', tag, args.length);
    switch (tag) {
      case 'setBundle': {
        assert(!dispatch, 'cannot setBundle again');
        const liveSlotsOptions = /** @type LiveSlotsOptions */ (args[2]);
        return setBundle(args[0], args[1], liveSlotsOptions);
      }
      case 'deliver': {
        assert(dispatch, 'cannot deliver before setBundle');
        const [vatDeliveryObject] = args;
        harden(vatDeliveryObject);
        insistVatDeliveryObject(vatDeliveryObject);
        return dispatch(vatDeliveryObject);
      }
      default:
        workerLog('handleItem: bad tag', tag, args.length);
        return ['bad tag', tag];
    }
  }

  return harden({
    handleItem,
  });
}

// xsnap provides issueCommand global
const port = managerPort(globalThis.issueCommand);
const worker = makeWorker(port);

// Send unexpected console messages to the manager port.
globalThis.print = (...args) => {
  port.send(['sourcedConsole', 'xsnap', 'error', ...args]);
};

globalThis.handleCommand = port.handlerFrom(worker.handleItem);
