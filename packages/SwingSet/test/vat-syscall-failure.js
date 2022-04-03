import { extractMessage } from './vat-util.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

export default function setup(syscall, _state, _helpers, vatPowers) {
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] !== 'message') {
      return;
    }
    const { method, args } = extractMessage(vatDeliverObject);
    vatPowers.testLog(`${method}`);
    const thing = method === 'begood' ? args.slots[0] : 'o-3414159';
    syscall.send(thing, capargs(['pretendToBeAThing', [method]]));
  }
  return dispatch;
}
