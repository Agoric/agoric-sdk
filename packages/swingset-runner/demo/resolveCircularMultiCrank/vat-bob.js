import { Far } from '@endo/marshal';

const makePR = () => {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
};

export const buildRootObject = _vatPowers => {
  let pX;
  let rX;
  let pY;
  let rY;
  return Far('root', {
    genPromiseX: () => {
      [pX, rX] = makePR();
      return pX;
    },
    genPromiseY: () => {
      [pY, rY] = makePR();
      return pY;
    },
    resPromiseX: v => {
      rX(v);
    },
    resPromiseY: v => {
      rY(v);
    },
  });
};
