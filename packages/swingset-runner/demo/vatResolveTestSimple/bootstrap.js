import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  const target = Far('target', {
    one() {
      log(`target in one`);
    },
    two() {
      log(`target in two`);
    },
  });
  return Far('root', {
    bootstrap(vats) {
      const bob = vats.bob;
      const p1 = E(bob).result();
      E(bob).promise(p1);
      E(bob).run(target);
    },
  });
}
