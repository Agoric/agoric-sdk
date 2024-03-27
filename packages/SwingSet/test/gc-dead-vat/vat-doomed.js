import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const pin = [];
  const doomedExport1 = Far('doomedExport1', {});
  const doomedExport2 = Far('doomedExport2', {});
  const doomedExport3 = Far('doomedExport3', {});
  return Far('root', {
    accept(exportToDoomedPresence) {
      pin.push(exportToDoomedPresence);
    },
    getDoomedExport1() {
      return doomedExport1;
    },
    stashDoomedExport2(target) {
      E(E(target).one()).neverCalled(doomedExport2);
    },
    getDoomedExport3() {
      return doomedExport3;
    },
    terminate() {
      vatPowers.exitVat('completion');
    },
  });
}
