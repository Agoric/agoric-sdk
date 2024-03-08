import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  let alice;
  let r;
  const p = new Promise(resolve => {
    r = resolve;
  });
  const obj = makeExo(
    'object',
    M.interface('object', {}, { defaultGuards: 'passable' }),
    {
      toString() {
        return 'sample-object';
      },
    },
  );
  const ourStuff = [obj, p];
  let theirStuff;

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
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
          const what = await E(alice).probeWeakMap(item);
          testLog(`probe of ${item} returns ${what}`);
        }
        for (const item of theirStuff) {
          const what = await E(alice).probeWeakMap(item);
          testLog(`probe of ${item} returns ${what}`);
        }
        return 'probes done';
      },
    },
  );
}
