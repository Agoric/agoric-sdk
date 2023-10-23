import { kser } from '@agoric/kmarshal';
import { extractMessage } from './vat-util.js';

export default function setup(syscall, _state, _helpers, vatPowers) {
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] !== 'message') {
      return;
    }
    const { method, args } = extractMessage(vatDeliverObject);
    vatPowers.testLog(`${method}`);
    const thing = method.startsWith('begood') ? args.slots[0] : 'o-3414159';
    syscall.send(thing, kser(['pretendToBeAThing', [method]]));
  }
  return dispatch;
}
