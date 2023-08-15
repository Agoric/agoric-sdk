import { Far } from '@endo/far';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject() {
  let p1;
  let r1;
  return Far('root', {
    genPromise1() {
      return 'Hello!';
    },
    genPromise2() {
      [p1, r1] = makePR();
      return p1;
    },
    usePromise(pa) {
      r1(pa);
    },
  });
}
