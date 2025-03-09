import { q, Fail } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { objectMap } from '@agoric/internal';
import { defineName } from '@agoric/internal/src/js-utils.js';
import { makeLimitedConsole } from '@agoric/internal/src/ses-utils.js';

/** @import {Callable} from '@agoric/internal'; */
/** @import {LimitedConsole} from '@agoric/internal/src/js-utils.js'; */
/** @import {SlogProps, SlogDurationProps, SwingsetController} from '../controller/controller.js'; */

const IDLE = 'idle';
const STARTUP = 'startup';
const DELIVERY = 'delivery';

const noopFinisher = harden(() => {});

/** @typedef {(...finishArgs: unknown[]) => unknown} AnyFinisher */
/** @typedef {Partial<Record<Exclude<keyof KernelSlog, 'write' | 'startDuration'>, (methodName: string, args: unknown[], finisher: AnyFinisher) => unknown>>} SlogWrappers */

/**
 * Support asynchronous slog callbacks that are invoked at the start
 * of an operation and return either a non-function result or a "finisher"
 * function to be invoked upon operation completion.
 * This maker accepts a collection of wrapper functions that receive the same
 * arguments as the method they wrap, along with the result of that method
 * (e.g., its finisher), and are expected to return a finisher of their own that
 * will invoke that wrapped finisher.
 *
 * @template {Record<string, Callable>} Methods
 * @param {SlogWrappers} slogCallbacks
 * @param {string} unusedMsgPrefix prefix for warn-level logging about unused callbacks
 * @param {Methods} methods to wrap
 * @returns {Methods}
 */
function addSlogCallbacks(slogCallbacks, unusedMsgPrefix, methods) {
  const unused = new Set(Object.keys(slogCallbacks));
  const wrappedMethods = /** @type {Methods} */ (
    objectMap(methods, (impl, methodKey) => {
      const methodName = /** @type {keyof typeof slogCallbacks} */ (methodKey);
      unused.delete(methodName);
      const wrapper = slogCallbacks[methodName];

      // If there is no registered wrapper, return the implementation directly.
      if (!wrapper) return impl;

      const wrapped = (...args) => {
        const maybeFinisher = /** @type {AnyFinisher} */ (impl(...args));
        try {
          // Allow the callback to observe the call synchronously, and replace
          // the implementation's finisher function, but not to throw an exception.
          const wrapperFinisher = wrapper(methodName, args, maybeFinisher);
          if (typeof maybeFinisher !== 'function') return wrapperFinisher;

          // We wrap the finisher in the callback's return value.
          return (...finishArgs) => {
            try {
              return /** @type {AnyFinisher} */ (wrapperFinisher)(
                ...finishArgs,
              );
            } catch (e) {
              console.error(`${methodName} wrapper finisher failed:`, e);
              return maybeFinisher(...finishArgs);
            }
          };
        } catch (e) {
          console.error(`${methodName} wrapper failed:`, e);
          return maybeFinisher;
        }
      };
      return /** @type {typeof impl} */ (/** @type {unknown} */ (wrapped));
    })
  );
  if (unused.size) {
    console.warn(unusedMsgPrefix, ...[...unused.keys()].sort().map(q));
  }
  return wrappedMethods;
}

export const badConsole = makeLimitedConsole(level => () => {
  throw Error(`unexpected use of badConsole.${level}`);
});
export const noopConsole = makeLimitedConsole(_level => () => {});

/**
 * @param {SlogWrappers} slogCallbacks
 * @param {LimitedConsole} [dummyConsole]
 * @returns {KernelSlog}
 */
export function makeDummySlogger(slogCallbacks, dummyConsole = badConsole) {
  const unusedWrapperPrefix =
    'Unused methods in makeDummySlogger slogCallbacks';
  const wrappedMethods = addSlogCallbacks(slogCallbacks, unusedWrapperPrefix, {
    provideVatSlogger: () =>
      harden({ vatSlog: { delivery: () => noopFinisher } }),
    vatConsole: () => dummyConsole,
    startup: () => noopFinisher,
    delivery: () => noopFinisher,
    syscall: () => noopFinisher,
    changeCList: () => noopFinisher,
    terminateVat: () => noopFinisher,
  });
  return harden({
    ...wrappedMethods,
    write: noopFinisher,
    startDuration: () => noopFinisher,
  });
}

/**
 * @callback StartDuration
 * Capture an extended process, writing an entry with `type` $startLabel and
 * then later (when the returned finish function is called) another entry with
 * `type` $endLabel and `seconds` reporting the intervening duration.
 *
 * @param {readonly [startLabel: string, endLabel: string]} labels
 * @param {SlogDurationProps} startProps
 * @returns {import('../types-external').FinishSlogDuration}
 */

/**
 * @param {SlogWrappers} slogCallbacks
 * @param {SwingsetController['writeSlogObject']} [writeSlogObject]
 * @param {SwingsetController['slogDuration']} [slogDuration] required when writeSlogObject is provided
 * @returns {KernelSlog}
 */
export function makeSlogger(slogCallbacks, writeSlogObject, slogDuration) {
  if (writeSlogObject && !slogDuration) {
    throw Fail`slogDuration is required with writeSlogObject`;
  }
  const { safeWrite, startDuration } = (() => {
    if (!writeSlogObject) {
      const dummySafeWrite = () => {};
      /** @type {StartDuration} */
      const dummyStartDuration = () => defineName('dummyFinish', () => {});
      return { safeWrite: dummySafeWrite, startDuration: dummyStartDuration };
    }
    /** @type {(obj: SlogProps) => void} */
    // eslint-disable-next-line no-shadow
    const safeWrite = obj => {
      try {
        writeSlogObject(obj);
      } catch (err) {
        console.error('WARNING: slogger write error', err);
      }
    };
    /** @type {StartDuration} */
    // eslint-disable-next-line no-shadow
    const startDuration = (labels, startProps) => {
      try {
        /** @type {(extraProps?: SlogDurationProps) => void} */
        let closeSpan;
        // @ts-expect-error TS2722 slogDuration is not undefined here
        void slogDuration(labels, startProps, async finish => {
          const doneKit = makePromiseKit();
          closeSpan = props => {
            try {
              finish(props);
            } finally {
              doneKit.resolve(undefined);
            }
          };
          // Hold the span open until `finish` is called.
          await doneKit.promise;
        });
        // @ts-expect-error TS2454 closeSpan must have been assigned above
        if (typeof closeSpan !== 'function') {
          throw Fail`slogDuration did not synchronously provide a finisher`;
        }
        return closeSpan;
      } catch (err) {
        console.error('WARNING: slogger write error', err);
        return defineName('dummyFinish', () => {});
      }
    };
    return { safeWrite, startDuration };
  })();

  const vatSlogs = new Map(); // vatID -> vatSlog

  function makeVatSlog(vatID) {
    let state = IDLE; // or STARTUP or DELIVERY
    let crankNum;
    let deliveryNum;
    let syscallNum;
    let replay = false;

    function checkOldState(exp, msg) {
      if (state !== exp) {
        console.error(
          `WARNING: slogger state confused: vat ${vatID} in ${state}, not ${exp}: ${msg}`,
        );
        safeWrite({ type: 'slogger-confused', vatID, state, exp, msg });
      }
    }

    function vatConsole(sourcedConsole) {
      return makeLimitedConsole(level => (source, ...args) => {
        // Don't duplicate stale output.
        if (replay) return;

        // Write to the console, then to the slog.
        sourcedConsole[level](source, ...args);
        // TODO: Just use "liveslots" rather than "ls"?
        if (source === 'ls') source = 'liveslots';
        const when = { state, crankNum, vatID, deliveryNum };
        safeWrite({ type: 'console', source, ...when, level, args });
      });
    }

    function startup() {
      // provide a context for console calls during startup
      checkOldState(IDLE, 'did startup get called twice?');
      state = STARTUP;
      const finish = startDuration(
        ['vat-startup-start', 'vat-startup-finish'],
        { vatID },
      );
      return harden(() => {
        checkOldState(STARTUP, 'startup-finish called twice?');
        state = IDLE;
        finish();
      });
    }

    // kd: kernelDelivery, vd: vatDelivery
    function delivery(newCrankNum, newDeliveryNum, kd, vd, inReplay = false) {
      checkOldState(IDLE, 'reentrant delivery?');
      state = DELIVERY;
      crankNum = newCrankNum;
      deliveryNum = newDeliveryNum;
      replay = inReplay;
      syscallNum = 0;
      const startProps = { crankNum, vatID, deliveryNum, replay, kd, vd };
      const finish = startDuration(['deliver', 'deliver-result'], startProps);
      // dr: deliveryResult
      return harden(dr => {
        checkOldState(DELIVERY, 'delivery-finish called twice?');
        state = IDLE;
        finish({ kd: undefined, vd: undefined, dr });
      });
    }

    // ksc: kernelSyscallObject, vsc: vatSyscallObject
    function syscall(ksc, vsc) {
      checkOldState(DELIVERY, 'syscall invoked outside of delivery');
      const finish = startDuration(['syscall', 'syscall-result'], {
        crankNum,
        vatID,
        deliveryNum,
        syscallNum,
        replay,
        ksc,
        vsc,
      });
      syscallNum += 1;
      // ksr: kernelSyscallResult, vsr: vatSyscallResult
      return harden((ksr, vsr) => {
        checkOldState(DELIVERY, 'syscall finished after delivery?');
        finish({ ksc: undefined, vsc: undefined, ksr, vsr });
      });
    }

    // mode: 'import' | 'export' | 'drop'
    function changeCList(crank, mode, kobj, vobj) {
      safeWrite({ type: 'clist', crankNum: crank, mode, vatID, kobj, vobj });
    }

    function terminateVat(shouldReject, info) {
      safeWrite({ type: 'terminate', vatID, shouldReject, info });
    }

    return harden({
      vatConsole,
      startup,
      delivery,
      syscall,
      changeCList,
      terminateVat,
    });
  }

  function provideVatSlogger(
    vatID,
    dynamic,
    description,
    name,
    vatSourceBundle,
    managerType,
    vatParameters,
  ) {
    const found = vatSlogs.get(vatID);
    if (found) {
      return { vatSlog: found, starting: false };
    }
    const vatSlog = makeVatSlog(vatID);
    vatSlogs.set(vatID, vatSlog);
    safeWrite({
      type: 'create-vat',
      vatID,
      dynamic,
      description,
      name,
      managerType,
      vatParameters,
      vatSourceBundle,
    });
    return { vatSlog, starting: true };
  }

  const unusedWrapperPrefix = 'Unused methods in makeSlogger slogCallbacks';
  const wrappedMethods = addSlogCallbacks(slogCallbacks, unusedWrapperPrefix, {
    provideVatSlogger,
    vatConsole: (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.vatConsole(...args),
    startup: (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.startup(...args),
    delivery: (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.delivery(...args),
    syscall: (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.syscall(...args),
    changeCList: (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.changeCList(...args),
    terminateVat: (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.terminateVat(...args),
  });
  return harden({ ...wrappedMethods, write: safeWrite, startDuration });
}
