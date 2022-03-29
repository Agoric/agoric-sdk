import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  const { held } = vatParameters;
  return Far('root', {
    foo: () => held, // hold until root goes away
  });
}
