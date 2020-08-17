import { E } from '@agoric/eventual-send';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers) {
  const target = {
    one() {
      log(`target in one`);
    },
    two() {
      log(`target in two`);
    },
  };
  return harden({
    bootstrap(vats) {
      const bob = vats.bob;
      const p1 = E(bob).result();
      E(bob).promise(p1);
      E(bob).run(target);
    },
  });
}
