import { Far } from '@endo/marshal';

const log = console.log;

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

export function buildRootObject() {
  let r1;
  let r2;
  return Far('root', {
    first() {
      log('=> Bob: first begins');
      let p1;
      void ([p1, r1] = makePR());
      return p1;
    },
    second(p) {
      log('=> Bob: second begins');
      let p2;
      void ([p2, r2] = makePR());
      r1([p2]);
      p.then(
        r => log(`=> Bob: second(p) resolved to '${r}'`),
        e => log(`=> Bob: second(p) rejected as '${e}'`),
      );
      log('=> Bob: second done');
      return p2;
    },
    third(_p) {
      log('=> Bob: third begins');
      r2(`Bob's resolution to p2`);
      return `Bob's answer to third`;
    },
  });
}
