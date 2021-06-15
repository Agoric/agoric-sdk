import { assert } from '@agoric/assert';
import { QCLASS } from '@agoric/marshal';
import { insistVatType } from '../../src/parseVatSlots.js';
import { extractMessage } from '../util.js';

// to exercise the error we get when syscall.callNow() is given a promise
// identifier, we must bypass liveslots, which would otherwise protect us
// against the vat-fatal mistake

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

export default function setup(syscall, state, _helpers, vatPowers) {
  const { callNow } = syscall;
  const { testLog } = vatPowers;
  function dispatch(vatDeliverObject) {
    const { method, args } = extractMessage(vatDeliverObject);
    if (method === 'bootstrap') {
      // find the device slot
      const [_vats, devices] = JSON.parse(args.body);
      const qnode = devices.d0;
      assert.equal(qnode[QCLASS], 'slot');
      const slot = args.slots[qnode.index];
      insistVatType('device', slot);

      const vpid = 'p+1'; // pretend we're exporting a promise
      const pnode = { [QCLASS]: 'slot', index: 0 };
      const callNowArgs = capargs([pnode], [vpid]);

      testLog('sending Promise');
      try {
        // this will throw an exception, but is also (eventually) vat-fatal
        callNow(slot, 'send', callNowArgs);
        testLog('oops: survived sending Promise');
      } catch (e) {
        testLog('good: callNow failed');
      }
    } else if (method === 'ping') {
      testLog('oops: still alive');
    }
  }
  return dispatch;
}
