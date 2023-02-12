import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, _vatParameters) {
  // console.log(`extra: ${vatParameters.name}`);
  return Far('root', {
    ping() {},
  });
}
