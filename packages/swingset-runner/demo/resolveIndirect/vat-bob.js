import { Far } from '@endo/marshal';

const makePR = () => {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
};

export const buildRootObject = _vatPowers => {
  let p1;
  let r1;
  return Far('root', {
    genPromise1: () => 'Hello!',
    genPromise2: () => {
      [p1, r1] = makePR();
      return p1;
    },
    usePromise: pa => {
      r1(pa);
    },
  });
};
