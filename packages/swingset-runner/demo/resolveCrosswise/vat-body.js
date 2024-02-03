import { Far } from '@endo/marshal';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject() {
  let p;
  let r;
  return Far('root', {
    genPromise() {
      void ([p, r] = makePR());
      return p;
    },
    usePromise(pa) {
      r(pa);
    },
  });
}
