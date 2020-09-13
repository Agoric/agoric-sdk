import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers) {
  return harden({
    bootstrap(vats) {
      vatPowers.testLog(`bootstrap.obj0.bootstrap()`);
      E(vats.left).foo(1, vats.right);
    },
  });
}
