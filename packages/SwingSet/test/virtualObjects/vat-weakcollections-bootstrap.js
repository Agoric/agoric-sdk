import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  const { testLog } = vatPowers;
  let alice;
  let r;
  const p = new Promise(resolve => {
    r = resolve;
  });
  const obj = Far('object', {
    toString: () => 'sample-object',
  });
  const ourStuff = [obj, p];
  let theirStuff;

  return Far('root', {
    bootstrap: async vats => {
      alice = vats.alice;
      theirStuff = await E(alice).prepareWeakMap(ourStuff);

      return 'bootstrap done';
    },
    betweenProbes: () => {
      r('resolved');
    },
    runProbes: async () => {
      for (const item of ourStuff) {
        // eslint-disable-next-line no-await-in-loop
        const what = await E(alice).probeWeakMap(item);
        testLog(`probe of ${item} returns ${what}`);
      }
      for (const item of theirStuff) {
        // eslint-disable-next-line no-await-in-loop
        const what = await E(alice).probeWeakMap(item);
        testLog(`probe of ${item} returns ${what}`);
      }
      return 'probes done';
    },
  });
};
