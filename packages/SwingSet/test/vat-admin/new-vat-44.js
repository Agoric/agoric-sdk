import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  const { adder } = vatParameters;
  return Far('root', {
    getANumber() {
      return E(adder).add1(43);
    },
  });
}
