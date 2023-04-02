import { makePromiseKit } from '@endo/promise-kit';
import { Far, E } from '@endo/far';

export function buildRootObject() {
  const pk1 = makePromiseKit();
  const pin = [];
  return Far('root', {
    bootstrap(vats) {
      pin.push(vats.right); // pin so test can send 'three' to it later
      const p2 = E(vats.right).one(); // p2 is kp41
      E(p2).four(pk1.promise);
      // that puts an unresolved promise in the arguments of the promise
      // queue for p2
    },
    two() {
      pk1.resolve(3);
      // The promise is resolved and retired from our clist, the only
      // remaining reference is from the p2 promise queue
    },
  });
}
