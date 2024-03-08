import { Far } from '@endo/marshal';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject() {
  let r = null;
  let value = 0;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      init() {
        let p;
        // eslint-disable-next-line prefer-const
        void ([p, r] = makePR());
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
    },
  );
}
