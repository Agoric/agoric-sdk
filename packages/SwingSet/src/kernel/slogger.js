import { q } from '@endo/errors';

const IDLE = 'idle';
const STARTUP = 'startup';
const DELIVERY = 'delivery';

function makeCallbackRegistry(callbacks) {
  const todo = new Set(Object.keys(callbacks));
  return harden({
    /**
     * Robustly wrap a method with a callbacks[method] function, if defined.  We
     * incur no runtime overhead if the given callback method isn't defined.
     *
     * @param {string} method wrap with callbacks[method]
     * @param {(...args: Array<unknown>) => unknown} impl the original
     * implementation of the method
     * @returns {(...args: Array<unknown>) => unknown} the wrapped method if the
     * callback is defined, or original method if not
     */
    registerCallback(method, impl) {
      todo.delete(method);
      const cb = callbacks[method];
      if (!cb) {
        // No registered callback, just use the implementation directly.
        // console.error('no registered callback for', method);
        return impl;
      }

      return (...args) => {
        // Invoke the implementation first.
        const ret = impl(...args);
        try {
          // Allow the callback to observe the call synchronously, and affect
          // the finisher function, but not to throw an exception.
          const cbRet = cb(method, args, ret);
          if (typeof ret === 'function') {
            // We wrap the finisher in the callback's return value.
            return (...finishArgs) => {
              try {
                return cbRet(...finishArgs);
              } catch (e) {
                console.error(
                  `failed to call registered ${method}.finish function:`,
                  e,
                );
              }
              return ret(...args);
            };
          }
          // We just return the callback's return value.
          return cbRet;
        } catch (e) {
          console.error('failed to call registered', method, 'callback:', e);
        }
        return ret;
      };
    },
    /**
     * Declare that all the methods have been registered.
     *
     * @param {string} errorUnusedMsg message to display if there are callback
     * names that don't correspond to a registration
     */
    doneRegistering(errorUnusedMsg = `Unrecognized callback names:`) {
      const cbNames = [...todo.keys()];
      if (!cbNames.length) {
        return;
      }
      console.warn(errorUnusedMsg, cbNames.map(q).sort().join(', '));
    },
  });
}

/**
 * @param {*} slogCallbacks
 * @param {Pick<Console, 'debug'|'log'|'info'|'warn'|'error'>} dummyConsole
 * @returns {KernelSlog}
 */
export function makeDummySlogger(slogCallbacks, dummyConsole) {
  const { registerCallback: reg, doneRegistering } =
    makeCallbackRegistry(slogCallbacks);
  const dummySlogger = harden({
    provideVatSlogger: reg('provideVatSlogger', () =>
      harden({
        vatSlog: {
          delivery: () => () => 0,
        },
      }),
    ),
    vatConsole: reg('vatConsole', () => dummyConsole),
    startup: reg('startup', () => () => 0), // returns nop finish() function
    replayVatTranscript: reg('replayVatTranscript', () => () => 0),
    delivery: reg('delivery', () => () => 0),
    syscall: reg('syscall', () => () => 0),
    changeCList: reg('changeCList', () => () => 0),
    terminateVat: reg('terminateVat', () => () => 0),
    write: () => 0,
  });
  doneRegistering(`Unrecognized makeDummySlogger slogCallbacks names:`);
  // @ts-expect-error xxx
  return dummySlogger;
}

/**
 * @param {*} slogCallbacks
 * @param {*} writeObj
 * @returns {KernelSlog}
 */
export function makeSlogger(slogCallbacks, writeObj) {
  const safeWrite = e => {
    try {
      writeObj(e);
    } catch (err) {
      console.error('WARNING: slogger write error', err);
    }
  };
  const write = writeObj ? safeWrite : () => 0;

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
        write({ type: 'slogger-confused', vatID, state, exp, msg });
      }
    }

    function vatConsole(sourcedConsole) {
      const vc = {};
      for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
        vc[level] = (sourceTag, ...args) => {
          if (replay) {
            // Don't duplicate stale console output.
            return;
          }
          sourcedConsole[level](sourceTag, ...args);
          const when = { state, crankNum, vatID, deliveryNum };
          const source = sourceTag === 'ls' ? 'liveslots' : sourceTag;
          write({ type: 'console', source, ...when, level, args });
        };
      }
      return harden(vc);
    }

    function startup() {
      // provide a context for console calls during startup
      checkOldState(IDLE, 'did startup get called twice?');
      state = STARTUP;
      write({ type: 'vat-startup-start', vatID });
      function finish() {
        checkOldState(STARTUP, 'startup-finish called twice?');
        state = IDLE;
        write({ type: 'vat-startup-finish', vatID });
      }
      return harden(finish);
    }

    // kd: kernelDelivery, vd: vatDelivery
    function delivery(newCrankNum, newDeliveryNum, kd, vd, inReplay = false) {
      checkOldState(IDLE, 'reentrant delivery?');
      state = DELIVERY;
      crankNum = newCrankNum;
      deliveryNum = newDeliveryNum;
      replay = inReplay;
      const when = { crankNum, vatID, deliveryNum, replay };
      write({ type: 'deliver', ...when, kd, vd });
      syscallNum = 0;

      // dr: deliveryResult
      function finish(dr) {
        checkOldState(DELIVERY, 'delivery-finish called twice?');
        write({ type: 'deliver-result', ...when, dr });
        state = IDLE;
      }
      return harden(finish);
    }

    // ksc: kernelSyscallObject, vsc: vatSyscallObject
    function syscall(ksc, vsc) {
      checkOldState(DELIVERY, 'syscall invoked outside of delivery');
      const when = { crankNum, vatID, deliveryNum, syscallNum, replay };
      write({ type: 'syscall', ...when, ksc, vsc });
      syscallNum += 1;

      // ksr: kernelSyscallResult, vsr: vatSyscallResult
      function finish(ksr, vsr) {
        checkOldState(DELIVERY, 'syscall finished after delivery?');
        write({ type: 'syscall-result', ...when, ksr, vsr });
      }
      return harden(finish);
    }

    // mode: 'import' | 'export' | 'drop'
    function changeCList(crank, mode, kobj, vobj) {
      write({ type: 'clist', crankNum: crank, mode, vatID, kobj, vobj });
    }

    function terminateVat(shouldReject, info) {
      write({ type: 'terminate', vatID, shouldReject, info });
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
    write({
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

  function replayVatTranscript(vatID) {
    write({ type: 'replay-transcript-start', vatID });
    function finish() {
      write({ type: 'replay-transcript-finish', vatID });
    }
    return harden(finish);
  }

  // function annotateVat(vatID, data) {
  //   write({ type: 'annotate-vat', vatID, data });
  // }

  const { registerCallback: reg, doneRegistering } =
    makeCallbackRegistry(slogCallbacks);
  const slogger = harden({
    provideVatSlogger: reg('provideVatSlogger', provideVatSlogger),
    vatConsole: reg('vatConsole', (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.vatConsole(...args),
    ),
    startup: reg('startup', (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.startup(...args),
    ),
    replayVatTranscript,
    delivery: reg('delivery', (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.delivery(...args),
    ),
    syscall: reg('syscall', (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.syscall(...args),
    ),
    changeCList: reg('changeCList', (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.changeCList(...args),
    ),
    terminateVat: reg('terminateVat', (vatID, ...args) =>
      provideVatSlogger(vatID).vatSlog.terminateVat(...args),
    ),
    write,
  });
  doneRegistering(`Unrecognized makeSlogger slogCallbacks names:`);
  // @ts-expect-error xxx
  return slogger;
}
