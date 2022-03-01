import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    getVersion() {
      return 'v2';
    },
    getParameters() {
      return vatParameters;
    },
  });
}
