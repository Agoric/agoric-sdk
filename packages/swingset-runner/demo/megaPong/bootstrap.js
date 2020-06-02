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
          console.log('=> bootstrap() called');
          E(vats.alice).setNickname('alice');
          E(vats.bob).setNickname('bob');
          E(vats.alice)
            .introduceYourselfTo(vats.bob)
            .then(
              r => log(`=> alice.introduceYourselfTo(bob) resolved to '${r}'`),
              e => log(`=> alice.introduceYourselfTo(bob) rejected as '${e}'`),
            );
          const count = argv[0] ? Number(argv[0]) : 10;
          E(vats.alice).grind('hey!', count);
        },
      }),
    helpers.vatID,
  );
}
