function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject(_vatPowers) {
  let pX;
  let rX;
  let pY;
  let rY;
  return harden({
    genPromiseX() {
      [pX, rX] = makePR();
      return pX;
    },
    genPromiseY() {
      [pY, rY] = makePR();
      return pY;
    },
    resPromiseX(v) {
      rX(v);
    },
    resPromiseY(v) {
      rY(v);
    },
  });
}
