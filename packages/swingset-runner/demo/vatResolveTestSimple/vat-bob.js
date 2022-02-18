import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

const makePR = () => {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
};

const hush = p => {
  p.then(
    () => undefined,
    () => undefined,
  );
};

export const buildRootObject = _vatPowers => {
  let p1;
  const [p0, r0] = makePR();
  return Far('root', {
    promise: p => {
      p1 = p;
      p1.then(
        x => {
          log(`p1 resolved to ${x}`);
        },
        _ => {
          log(`p1 rejected`);
        },
      );
    },
    result: () => p0,
    run: async target => {
      const p2 = E(p1).one();
      hush(p2);
      r0(target);
      const p3 = E(p1).two();
      hush(p3);
    },
  });
};
