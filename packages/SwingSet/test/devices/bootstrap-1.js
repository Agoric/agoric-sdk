import { Fail } from '@endo/errors';
import { kser, kunser, krefOf } from '@agoric/kmarshal';
import { extractMessage } from '../vat-util.js';

export default function setup(syscall, state, _helpers, vatPowers) {
  const { testLog } = vatPowers;
  let deviceRef;
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] === 'message') {
      const { method, args } = extractMessage(vatDeliverObject);
      if (method === 'bootstrap') {
        const [_vats, devices] = kunser(args);
        deviceRef = krefOf(devices.d1);
        deviceRef === 'd-70' || Fail`bad deviceRef ${deviceRef}`;
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
