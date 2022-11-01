import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function hush(p) {
  p.then(
    () => undefined,
    () => undefined,
  );
}

export function buildRootObject() {
  let p1;
  const [p0, r0] = makePR();
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
    async run(target1, target2) {
      log(`calling one()`);
      const p2 = E(target1).one(p1);
      hush(p2);
      log(`calling two()`);
      const p3 = E(p1).two();
      hush(p3);
      r0(target2);
      log(`calling three()`);
      const p4 = E(target1).three(p1);
      hush(p4);
      log(`calling four()`);
      const p5 = E(p1).four();
      hush(p5);
      log(`did all calls`);
    },
  });
}
