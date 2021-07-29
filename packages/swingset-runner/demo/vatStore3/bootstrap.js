import { E } from '@agoric/eventual-send';

export function buildRootObject(_vatPowers) {
  let other;
  let bob;
  let me;
  let goCount = 3;
  return harden({
    async bootstrap(vats) {
      me = vats.bootstrap;
      bob = vats.bob;
      E(bob).prepare();
      await E(me).go();
    },
    go() {
      if (goCount > 0) {
        E(bob).getThing(me);
      } else {
        E(bob).finish();
      }
      goCount -= 1;
    },
    deliverThing(thing) {
      // eslint thinks 'other' is unused, but eslint is wrong.
      // eslint-disable-next-line no-unused-vars
      other = thing;
      E(me).go();
    },
  });
}
