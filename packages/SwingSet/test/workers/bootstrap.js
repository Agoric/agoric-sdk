import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

export function buildRootObject() {
  const callbackObj = harden({
    callback(arg1, arg2) {
      console.log(`callback`, arg1, arg2);
      return ['data', callbackObj]; // four, resolves pF
    },
  });

  const precD = makePromiseKit();
  const precE = makePromiseKit();

  return harden({
    bootstrap(vats) {
      const pA = E(vats.target).zero(callbackObj, precD.promise, precE.promise);
      const rp3 = E(vats.target).one();
      precD.resolve(callbackObj); // two
      precE.reject(Error('four')); // three
      const done = Promise.all([
        pA.then(([pB, pC, pF]) => Promise.all([pB, pC.catch(() => 0), pF])),
        rp3,
      ]);
      return done;
    },
  });
}
