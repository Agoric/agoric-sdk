import { Far, E } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  const { adder } = vatParameters;
  function rcvrMaker(seed) {
    let count = 0;
    let sum = seed;
    return makeExo(
      'rcvr',
      M.interface('rcvr', {}, { defaultGuards: 'passable' }),
      {
        increment(val) {
          sum += val;
          count += 1;
          return sum;
        },
        add2(val) {
          return E(adder).add1(val + 1);
        },
        ticker() {
          return count;
        },
      },
    );
  }
  const root = makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      getANumber() {
        return 13;
      },
      sendMsg(obj, arg) {
        return E(obj).message(arg);
      },
      createRcvr(init) {
        return rcvrMaker(init);
      },
    },
  );
  // exercise async return
  return Promise.resolve(root);
}
