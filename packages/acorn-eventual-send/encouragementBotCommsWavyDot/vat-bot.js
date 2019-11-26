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
        encourageMe(name) {
          log(`=> encouragementBot.encourageMe got the name: ${name}`);
          return `${name}, you are awesome, keep it up!`;
        },
      }),
    helpers.vatID,
  );
}
