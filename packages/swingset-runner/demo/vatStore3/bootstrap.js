import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  // 'other' is not read but it's used to hold a hard ref
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
