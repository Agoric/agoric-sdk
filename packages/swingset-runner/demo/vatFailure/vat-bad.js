import { assert } from '@agoric/assert';

const capdata = (body, slots = []) => harden({ body, slots });

const capargs = (args, slots = []) => capdata(JSON.stringify(args), slots);

export default (syscall, _state, _helpers, _vatPowers) => {
  const deliver = (target, method, args) => {
    const thing = method === 'begood' ? args.slots[0] : 'o-3414159';
    syscall.send(thing, 'pretendToBeAThing', capargs([method]));
  };
  const dispatch = vatDeliveryObject => {
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
  };
  harden(dispatch);
  return dispatch;
};
