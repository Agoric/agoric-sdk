import { Far, E } from '@endo/far';

export function buildRootObject() {
  let bob;
  return Far('root', {
    async bootstrap(vats) {
      bob = vats.bob;
    },
    async run(kind, what, how) {
      await E(bob).reset();
      const things = await E(bob).retain(kind, what, how);
      const compare = await E(bob).compare(things, kind, what, how);
      return compare;
    },
  });
}
