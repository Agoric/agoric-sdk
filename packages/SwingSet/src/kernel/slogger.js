import { assert } from '@agoric/assert';

const IDLE = 'idle';
const STARTUP = 'startup';
const DELIVERY = 'delivery';

export function makeDummySlogger(makeConsole) {
  return harden({
    addVat: () => 0,
    vatConsole: () => makeConsole('disabled slogger'),
    startup: () => () => 0, // returns nop finish() function
    delivery: () => () => 0,
    syscall: () => () => 0,
  });
}

export function makeSlogger(writeObj) {
  const write = writeObj ? e => writeObj(harden(e)) : () => 0;

  const vatSlogs = new Map(); // vatID -> vatSlog

  function makeVatSlog(vatID) {
    let state = IDLE; // or STARTUP or DELIVERY
    let crankNum;
    let deliveryNum = 0;
    let syscallNum;

    function assertOldState(exp, msg) {
      assert(state === exp, `vat ${vatID} in ${state}, not ${exp}: ${msg}`);
    }

    function vatConsole(origConsole) {
      const vc = {};
      for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
        vc[level] = (...args) => {
          origConsole[level](...args);
          const when = { state, crankNum, vatID, deliveryNum };
          write({ type: 'console', ...when, level, args });
        };
      }
      return harden(vc);
    }

    function startup() {
      // provide a context for console calls during startup
      assertOldState(IDLE, 'did startup get called twice?');
      state = STARTUP;
      function finish() {
        assertOldState(STARTUP, 'startup-finish called twice?');
        state = IDLE;
      }
      return harden(finish);
    }

    // kd: kernelDelivery, vd: vatDelivery
    function delivery(newCrankNum, kd, vd) {
      assertOldState(IDLE, 'reentrant delivery?');
      state = DELIVERY;
      crankNum = newCrankNum;
      const when = { crankNum, vatID, deliveryNum };
      write({ type: 'deliver', ...when, kd, vd });
      deliveryNum += 1;
      syscallNum = 0;

      // dr: deliveryResult
      function finish(dr) {
        assertOldState(DELIVERY, 'delivery-finish called twice?');
        write({ type: 'deliver-result', ...when, dr });
        state = IDLE;
      }
      return harden(finish);
    }

    // ksc: kernelSyscallObject, vsc: vatSyscallObject
    function syscall(ksc, vsc) {
      assertOldState(DELIVERY, 'syscall invoked outside of delivery');
      const when = { crankNum, vatID, deliveryNum, syscallNum };
      write({ type: 'syscall', ...when, ksc, vsc });
      syscallNum += 1;

      // ksr: kernelSyscallResult, vsr: vatSyscallResult
      function finish(ksr, vsr) {
        assertOldState(DELIVERY, 'syscall finished after delivery?');
        write({ type: 'syscall-result', ...when, ksr, vsr });
      }
      return harden(finish);
    }
    return harden({ vatConsole, startup, delivery, syscall });
  }

  function addVat(vatID, dynamic, description, vatSourceBundle) {
    assert(!vatSlogs.has(vatID), `already have slog for ${vatID}`);
    const vatSlog = makeVatSlog(vatID);
    vatSlogs.set(vatID, vatSlog);
    write({ type: 'create-vat', vatID, dynamic, description, vatSourceBundle });
    return vatSlog;
  }

  // function annotateVat(vatID, data) {
  //   write({ type: 'annotate-vat', vatID, data });
  // }

  return harden({
    addVat,
    vatConsole: (vatID, ...args) => vatSlogs.get(vatID).vatConsole(...args),
    startup: (vatID, ...args) => vatSlogs.get(vatID).startup(...args),
    delivery: (vatID, ...args) => vatSlogs.get(vatID).delivery(...args),
    syscall: (vatID, ...args) => vatSlogs.get(vatID).syscall(...args),
  });
}
