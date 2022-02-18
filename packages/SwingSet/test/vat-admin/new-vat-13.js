import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers => {
  const rcvrMaker = seed => {
    let count = 0;
    let sum = seed;
    return Far('rcvr', {
      increment: val => {
        sum += val;
        count += 1;
        return sum;
      },
      ticker: () => count,
    });
  };
  return Far('root', {
    getANumber: () => 13,
    sendMsg: (obj, arg) => E(obj).message(arg),
    createRcvr: init => rcvrMaker(init),
  });
};
