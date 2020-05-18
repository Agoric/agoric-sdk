import harden from '@agoric/harden';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function build(_E, log) {
  let r1;
  let r2;
  return {
    first() {
      log('=> Bob: first begins');
      let p1;
      [p1, r1] = makePR();
      return p1;
    },
    second(p) {
      log('=> Bob: second begins');
      let p2;
      [p2, r2] = makePR();
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
  };
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => harden(build(E, log)),
    helpers.vatID,
  );
}
