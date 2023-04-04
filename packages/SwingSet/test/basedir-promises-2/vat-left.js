import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  const obj0 = Far('root', {
    checkHarden(o1) {
      vatPowers.testLog(`o1 frozen ${Object.isFrozen(o1)}`);
      return obj0;
    },
  });
  return obj0;
}
