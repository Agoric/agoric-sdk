import { Far } from '@endo/marshal';

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
      void ([p1, r1] = makePR());
      return p1;
    },
    usePromise(pa) {
      r1(pa);
    },
  });
}
