/* global harden */

function buildRootObject(vatPowers) {
  let counter = 0;
  return harden({
    increment() {
      counter += 1;
    },
    read() {
      return counter;
    },
    tildot() {
      return vatPowers.transformTildot('x~.foo(arg1)');
    },
    remotable() {
      const r = vatPowers.Remotable('iface1');
      return vatPowers.getInterfaceOf(r);
    },
  });
}

export default function setup(syscall, state, helpers, vatPowers0) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D, vatPowers) => buildRootObject(vatPowers),
    helpers.vatID,
    vatPowers0,
  );
}
