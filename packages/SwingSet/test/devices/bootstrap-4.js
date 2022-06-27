import { QCLASS } from '@endo/marshal';
import { insistVatType } from '../../src/lib/parseVatSlots.js';
import { extractMessage } from '../vat-util.js';

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
  let slot;
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] === 'message') {
      const { method, args, result } = extractMessage(vatDeliverObject);
      if (method === 'bootstrap') {
        // find and stash the device slot
        const [_vats, devices] = JSON.parse(args.body);
        const qnode = devices.d0;
        assert.equal(qnode[QCLASS], 'slot');
        slot = args.slots[qnode.index];
        insistVatType('device', slot);
        // resolve the bootstrap() promise now, so it won't be rejected later
        // when we're terminated
        syscall.resolve([[result, false, capargs(0, [])]]);
      } else if (method === 'doBadCallNow') {
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
  }
  return dispatch;
}
