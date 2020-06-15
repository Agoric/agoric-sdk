import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`=> setup called`);
  let alice;
  let bob;
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        bootstrap(argv, vats) {
          alice = vats.alice;
          bob = vats.bob;
          console.log('=> bootstrap() called');
          E(alice).setNickname('alice');
          E(bob).setNickname('bob');
          E(alice)
            .introduceYourselfTo(bob)
            .then(
              r => log(`=> alice.introduceYourselfTo(bob) resolved to '${r}'`),
              e => log(`=> alice.introduceYourselfTo(bob) rejected as '${e}'`),
            );
        },
        runBenchmarkRound() {
          E(alice).doPing('hey!');
        },
      }),
    helpers.vatID,
  );
}
