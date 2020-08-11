import { E } from '@agoric/eventual-send';
import { producePromise } from '@agoric/promise-kit';

function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}

export function buildRootObject() {
  const callbackObj = harden({
    callback(arg1, arg2) {
      console.log(`callback`, arg1, arg2);
      return ['data', callbackObj]; // four, resolves pF
    },
  });

  const precD = producePromise();
  const precE = producePromise();

  return harden({
    bootstrap(_argv, vats) {
      const pA = E(vats.target).zero(callbackObj, precD.promise, precE.promise);
      E(vats.target).one();
      precD.resolve(callbackObj); // two
      precE.reject(Error('four')); // three
      pA.then(([pB, pC]) => {
        ignore(pB);
        ignore(pC);
      });
    },
  });
}
