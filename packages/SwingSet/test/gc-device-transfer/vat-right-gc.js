import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  const { D, testLog } = vatPowers;
  let stashDevice;
  return Far('right', {
    acceptDevice: async dev => {
      stashDevice = dev;
    },
    getAmy: async () => {
      const amy = D(stashDevice).get();
      testLog('vat-right got amy');
      await E(amy).hello('hi amy from vat-right');
    },
  });
};
