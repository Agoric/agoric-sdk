import harden from '@agoric/harden';

export default harden(E => {
  // eslint-disable-next-line no-shadow,global-require
  const harden = require('@agoric/harden');
  function rcvrMaker(seed) {
    let count = 0;
    let sum = seed;
    return harden({
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
  return harden({
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
});
