import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

function build(E, log) {
  return {
    bootstrap(argv, vats) {
      console.log('=> Alice: bootstrap() called');

      const p1 = E(vats.bob).first();
      const p2 = E(vats.bob).second(p1);
      const p3 = E(vats.bob).third();
      p1.then(
        r => {
          log(`=> Alice: Bob.first resolved to '${r}' (should be a promise in an array)`);
          r[0].then(
            rr => log(`=> Alice: Bob.first result resolved to '${rr}'`),
            ee => log(`=> Alice: Bob.first result rejected as '${ee}'`),
          );
        },
        e => log(`=> Alice: Bob.first rejected as '${e}'`),
      );
      p2.then(
        r => log(`=> Alice: Bob.second resolved to '${r}'`),
        e => log(`=> Alice: Bob.second rejected as '${e}'`),
      );
      p3.then(
        r => log(`=> Alice: Bob.third resolved to '${r}'`),
        e => log(`=> Alice: Bob.third rejected as '${e}'`),
      );
      log('=> Alice: bootstrap() done');
      return 'Alice started';
    },
  };
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => harden(build(E, log)),
    helpers.vatID,
  );
}
