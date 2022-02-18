import { Far } from '@endo/marshal';

const makePR = () => {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
};

export const buildRootObject = _vatPowers => {
  let p;
  let r;
  return Far('root', {
    genPromise: () => {
      [p, r] = makePR();
      return p;
    },
    usePromise: pa => {
      r(pa);
    },
    getThing: () => p,
  });
};
