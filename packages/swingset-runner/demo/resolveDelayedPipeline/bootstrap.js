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
          const thingP = E(vats.bob).getThing();
          console.log('=> Alice: called bob.getThing()');
          E(thingP)
            .answer()
            .then(
              r => {
                log(`=> Alice: thing.answer #1 resolved to '${r}'`);
                E(thingP)
                  .answer()
                  .then(
                    r => log(`=> Alice: thing.answer #2 resolved to '${r}'`),
                    e => log(`=> Alice: thing.answer #2 rejected as '${e}'`),
                  );
              },
              e => log(`=> Alice: thing.answer #1 rejected as '${e}'`),
            );
          log('=> Alice: bootstrap() done');
          return 'Alice started';
        },
      }),
    helpers.vatID,
  );
}
