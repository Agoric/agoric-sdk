import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  function rcvrMaker(seed) {
    let count = 0;
    let sum = seed;
    return Far('rcvr', {
      increment(val) {
        sum += val;
        count += 1;
        return sum;
      },
      ticker() {
        return count;
      },
    });
  }
  return Far('root', {
    getANumber() {
      return 13;
    },
    sendMsg(obj, arg) {
      return E(obj).message(arg);
    },
    createRcvr(init) {
      return rcvrMaker(init);
    },
  });
}
