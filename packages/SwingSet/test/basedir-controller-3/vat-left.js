import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers) {
  return harden({
    foo(arg1, right) {
      vatPowers.testLog(`left.foo ${arg1}`);
      E(right).bar(2, right);
    },
  });
}
