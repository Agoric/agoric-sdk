import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  const { held } = vatParameters;
  return Far('root', {
    foo: () => held, // hold until root goes away
  });
}
