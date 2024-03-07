import { Far, E } from '@endo/far';

export function buildRootObject() {
  // build the import sensor
  const imp1 = makeExo(`import-1`, M.interface(`import-1`, {}, { defaultGuards: 'passable' }), {});

  let targetvat;

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async bootstrap(vats) {
        targetvat = vats.target;
      },

      async getImportSensors() {
        return [imp1];
      },

      async step1() {
        await E(targetvat).build(imp1);
      },

      async step2() {
        await E(targetvat).delete();
      },

      async step3() {
        await E(targetvat).flush();
      },
    },
  );
}
