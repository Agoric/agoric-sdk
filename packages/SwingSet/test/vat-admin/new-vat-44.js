import { Far, E } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  const { adder } = vatParameters;
  return Far('root', {
    getANumber() {
      return E(adder).add1(43);
    },
  });
}
