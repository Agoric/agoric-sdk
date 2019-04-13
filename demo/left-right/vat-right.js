import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }

  return helpers.makeLiveSlots(
    syscall,
    state,
    _E =>
      harden({
        affirmMe(msg) {
          log(`=> affirmationBot.affirmMe got the message: ${msg}`);
          return `${msg}, you are wonderful!`;
        },
      }),
    helpers.vatID,
  );
}
