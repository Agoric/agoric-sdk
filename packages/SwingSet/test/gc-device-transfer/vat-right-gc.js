import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  const { D, testLog } = vatPowers;
  let stashDevice;
  return Far('right', {
    async acceptDevice(dev) {
      stashDevice = dev;
    },
    async getAmy() {
      const amy = D(stashDevice).get();
      testLog('vat-right got amy');
      await E(amy).hello('hi amy from vat-right');
    },
  });
}
