import { Far } from '@endo/marshal';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject() {
  let pX;
  let rX;
  let pY;
  let rY;
  return Far('root', {
    genPromiseX() {
      void ([pX, rX] = makePR());
      return pX;
    },
    genPromiseY() {
      void ([pY, rY] = makePR());
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
