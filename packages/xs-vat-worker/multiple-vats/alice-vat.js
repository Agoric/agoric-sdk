(function buildRootObject(vatPowers) {
  const { freeze } = Object;
  const { testLog } = vatPowers;

  let count = 0;

  return freeze({
    incr() {
      return count++;
    },
    decr() {
      return count--;
    },
  });
});
