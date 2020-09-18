export function buildRootObject(vatPowers) {
  const obj0 = {
    bar(arg2, self) {
      vatPowers.testLog(`right.obj0.bar ${arg2} ${self === obj0}`);
      return 3;
    },
  };
  return harden(obj0);
}
