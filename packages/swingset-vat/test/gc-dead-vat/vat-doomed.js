import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  const pin = [];
  const doomedExport1 = Far('doomedExport1', {});
  const doomedExport2 = Far('doomedExport2', {});
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
    terminate() {
      vatPowers.exitVat('completion');
    },
  });
}
