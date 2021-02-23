import { Far, getInterfaceOf } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  let counter = 0;
  return Far('root', {
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
      const r = Far('iface1');
      return getInterfaceOf(r);
    },
  });
}
