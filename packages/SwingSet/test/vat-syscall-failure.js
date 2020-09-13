function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

export default function setup(syscall, _state, _helpers, vatPowers) {
  function deliver(target, method, args) {
    vatPowers.testLog(`${method}`);
    const thing = method === 'begood' ? args.slots[0] : 'o-3414159';
    syscall.send(thing, 'pretendToBeAThing', capargs([method]));
  }
  return { deliver };
}
