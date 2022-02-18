import { extractMessage } from './vat-util.js';

const capdata = (body, slots = []) => harden({ body, slots });

const capargs = (args, slots = []) => capdata(JSON.stringify(args), slots);

export default (syscall, _state, _helpers, vatPowers) => {
  const dispatch = vatDeliverObject => {
    const { method, args } = extractMessage(vatDeliverObject);
    vatPowers.testLog(`${method}`);
    const thing = method === 'begood' ? args.slots[0] : 'o-3414159';
    syscall.send(thing, 'pretendToBeAThing', capargs([method]));
  };
  return dispatch;
};
