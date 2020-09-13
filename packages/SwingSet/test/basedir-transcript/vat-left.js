import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  const obj0 = {
    callRight(arg1, right) {
      log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => log(`left.then ${a}`));
      return 3;
    },
  };
  return harden(obj0);
}
