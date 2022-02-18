import { Far } from '@endo/marshal';

export const buildRootObject = (vatPowers, _vatParameters) => {
  const { D } = vatPowers;
  return Far('root', {
    bootstrap: async (vats, devices) => {
      let got;
      try {
        D(devices.d5).pleaseThrow('with message');
        got = 'oops, did not throw';
      } catch (e) {
        got = e;
      }
      return harden(['got', got]);
    },
  });
};
