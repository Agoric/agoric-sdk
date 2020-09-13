export function buildRootObject(vatPowers) {
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
      const r = vatPowers.Remotable('Alleged: iface1');
      return vatPowers.getInterfaceOf(r);
    },
  });
}
