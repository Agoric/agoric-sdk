import { assert, details as X } from '@agoric/assert';
import { extractMessage } from '../vat-util.js';
import { kser, kunser, krefOf } from '../../src/lib/kmarshal.js';

export default function setup(syscall, state, _helpers, vatPowers) {
  const { testLog } = vatPowers;
  let deviceRef;
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] === 'message') {
      const { method, args } = extractMessage(vatDeliverObject);
      if (method === 'bootstrap') {
        const [_vats, devices] = kunser(args);
        deviceRef = krefOf(devices.d1);
        assert(deviceRef === 'd-70', X`bad deviceRef ${deviceRef}`);
      } else if (method === 'step1') {
        testLog(`callNow`);
        const setArgs = kser([1, 2]);
        const ret = syscall.callNow(deviceRef, 'set', setArgs);
        testLog(JSON.stringify(ret));
      }
    }
  }
  return dispatch;
}
