import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers =>
  Far('root', {
    foo: (arg1, right) => {
      vatPowers.testLog(`left.foo ${arg1}`);
      E(right).bar(2, right);
    },
  });
