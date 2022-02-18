import { Far } from '@endo/marshal';

const makePR = () => {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
};

export const buildRootObject = _vatPowers => {
  const rs = new Map();
  return Far('root', {
    genPromise: idx => {
      const [p, r] = makePR();
      rs.set(idx, r);
      return p;
    },
    usePromise: (idx, p) => {
      const r = rs.get(idx);
      r(p);
    },
  });
};
