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
          E(vats.user)
            .talkToBot(vats.bot, 'encouragementBot')
            .then(
              r =>
                log(
                  `=> the promise given by the call to user.talkToBot resolved to '${r}'`,
                ),
              err =>
                log(
                  `=> the promise given by the call to user.talkToBot was rejected '${err}''`,
                ),
            );
        },
      }),
    helpers.vatID,
  );
}
