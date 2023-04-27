import { Far, E } from '@endo/far';

export function buildRootObject() {
  // eslint thinks 'other' is unused, but eslint is wrong.
  // eslint-disable-next-line no-unused-vars
  let other;
  let bob;
  let me;
  let goCount = 3;
  return Far('root', {
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
      other = thing;
      E(me).go();
    },
  });
}
