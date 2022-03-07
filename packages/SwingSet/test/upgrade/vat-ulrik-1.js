import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    getVersion() {
      return 'v1';
    },
    getParameters() {
      return vatParameters;
    },
  });
}
