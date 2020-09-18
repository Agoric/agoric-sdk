export function buildRootObject(vatPowers) {
  const obj0 = {
    checkHarden(o1) {
      vatPowers.testLog(`o1 frozen ${Object.isFrozen(o1)}`);
      return harden(obj0);
    },
  };
  return harden(obj0);
}
