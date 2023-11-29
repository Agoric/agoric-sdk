import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

const log = console.log;

function hush(p) {
  p.then(
    () => undefined,
    () => undefined,
  );
}

export function buildRootObject() {
  let p1;
  const { promise: p0, resolve: r0 } = makePromiseKit();
  return Far('root', {
    promise(p) {
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
    result() {
      return p0;
    },
    async run(target) {
      const p2 = E(p1).one();
      hush(p2);
      r0(target);
      const p3 = E(p1).two();
      hush(p3);
    },
  });
}
