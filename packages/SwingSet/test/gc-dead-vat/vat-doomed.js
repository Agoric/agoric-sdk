import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  const pin = [];
  const exportedRemotable = Far('exported', {});
  return Far('root', {
    accept(args) {
      pin.push(args);
      return exportedRemotable;
    },
    terminate() {
      vatPowers.exitVat('completion');
    },
  });
}
