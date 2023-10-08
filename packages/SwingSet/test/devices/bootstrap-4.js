import { kunser, kser, kslot, krefOf } from '@agoric/kmarshal';
import { insistVatType } from '../../src/lib/parseVatSlots.js';
import { extractMessage } from '../vat-util.js';

// to exercise the error we get when syscall.callNow() is given a promise
// identifier, we must bypass liveslots, which would otherwise protect us
// against the vat-fatal mistake

export default function setup(syscall, state, _helpers, vatPowers) {
  const { callNow } = syscall;
  const { testLog } = vatPowers;
  let d0;
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] === 'message') {
      const { method, args, result } = extractMessage(vatDeliverObject);
      if (method === 'bootstrap') {
        // find and stash the device slot
        const [_vats, devices] = kunser(args);
        d0 = devices.d0;
        insistVatType('device', krefOf(d0));
        // resolve the bootstrap() promise now, so it won't be rejected later
        // when we're terminated
        syscall.resolve([[result, false, kser(0)]]);
      } else if (method === 'doBadCallNow') {
        const vpid = 'p+1'; // pretend we're exporting a promise
        testLog('sending Promise');
        try {
          // this will throw an exception, but is also (eventually) vat-fatal
          callNow(krefOf(d0), 'send', kser([kslot(vpid)]));
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
