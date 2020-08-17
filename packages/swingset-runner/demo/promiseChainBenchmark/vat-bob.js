function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject(_vatPowers) {
  let r = null;
  let value = 0;
  return harden({
    init() {
      let p;
      // eslint-disable-next-line prefer-const
      [p, r] = makePR();
      return p;
    },
    gen() {
      // eslint-disable-next-line prefer-const
      let [p, newR] = makePR();
      const answer = [value, p];
      value += 1;
      r(answer);
      r = newR;
    },
  });
}
