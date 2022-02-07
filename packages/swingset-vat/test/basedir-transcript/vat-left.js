import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  const obj0 = Far('root', {
    callRight(arg1, right) {
      log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => log(`left.then ${a}`));
      return 3;
    },
  });
  return obj0;
}
