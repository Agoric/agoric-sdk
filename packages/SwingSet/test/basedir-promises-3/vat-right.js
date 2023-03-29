import { Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  const pk3 = makePromiseKit();
  const pk4 = makePromiseKit();
  const t2 = Far('t2', {
    four(arg) {
      // arg should be a Promise that promptly resolves to 4
      const argP = Promise.resolve(arg);
      const wasP = argP === arg;
      return argP.then(newArg => pk4.resolve([wasP, newArg]));
    },
  });

  return Far('root', {
    one() {
      return pk3.promise;
    },
    three() {
      pk3.resolve(t2);
      return pk4.promise;
    },
  });
}
