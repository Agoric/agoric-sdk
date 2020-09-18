export function buildRootObject(vatPowers) {
  return harden({
    bar(arg2) {
      vatPowers.testLog(`right ${arg2}`);
      return 4;
    },
  });
}
