import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject(_vatPowers, vatParameters) {
  const { promise: p1 } = makePromiseKit();
  const { promise: p2 } = makePromiseKit();
  let heldPromise;

  return Far('root', {
    getVersion() {
      return 'v1';
    },
    getParameters() {
      return vatParameters;
    },
    acceptPromise(p) {
      // stopVat will reject the promises that we decide, but should
      // not touch the ones we don't decide, so we hold onto this
      // until upgrade, to probe for bugs in that loop
      heldPromise = p;
      heldPromise.catch(() => 'hush');
    },
    getEternalPromise() {
      return { p1 };
    },
    returnEternalPromise() {
      return p2;
    },
  });
}
