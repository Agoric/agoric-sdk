import { assert } from '@endo/errors';
import { kser } from '@agoric/kmarshal';

export default function setup(syscall, _state, _helpers, _vatPowers) {
  function deliver(target, method, args) {
    const thing = method === 'begood' ? args.slots[0] : 'o-3414159';
    syscall.send(thing, 'pretendToBeAThing', kser([method]));
  }
  function dispatch(vatDeliveryObject) {
    const [type, ...args] = vatDeliveryObject;
    switch (type) {
      case 'message': {
        const [targetSlot, msg] = args;
        deliver(targetSlot, msg.method, msg.args);
        return;
      }
      default:
        assert.fail(`we only do deliveries here`);
    }
  }
  harden(dispatch);
  return dispatch;
}
