import { Far, E } from '@endo/far';

export function buildRootObject() {
  // build the import sensor
  const imp1 = Far(`import-1`, {});

  let targetvat;

  return Far('root', {
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
  });
}
