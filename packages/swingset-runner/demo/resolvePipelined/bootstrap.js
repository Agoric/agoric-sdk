import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        bootstrap(argv, vats) {
          console.log('=> Alice: bootstrap() called');

          log('Alice: sending first() to Bob');
          const p1 = E(vats.bob).first();
          log('Alice: sending second to result of first()');
          const p2 = E(p1).second(p1);
          log(`Alice: awaiting responses to second()`);
          p1.then(
            r => log(`=> Alice: Bob's response to first() resolved to '${r}'`),
            e => log(`=> Alice: Bobs' response to first() rejected as '${e}'`),
          );
          p2.then(
            r => log(`=> Alice: response to second() resolved to '${r}'`),
            e => log(`=> Alice: response to second() rejected as '${e}'`),
          );
          log('=> Alice: bootstrap() done');
          return 'Alice started';
        },
      }),
    helpers.vatID,
  );
}
