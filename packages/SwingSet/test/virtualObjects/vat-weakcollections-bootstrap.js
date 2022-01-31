import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  let alice;
  let r;
  const p = new Promise(resolve => {
    r = resolve;
  });
  const obj = Far('object', {
    toString() {
      return 'sample-object';
    },
  });
  const ourStuff = [obj, p];
  let theirStuff;

  return Far('root', {
    async bootstrap(vats) {
      alice = vats.alice;
      theirStuff = await E(alice).prepareWeakMap(ourStuff);

      return 'bootstrap done';
    },
    betweenProbes() {
      r('resolved');
    },
    async runProbes() {
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
}
