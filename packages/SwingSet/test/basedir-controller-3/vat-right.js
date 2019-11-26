import harden from '@agoric/harden';

function build(E, log) {
  const obj0 = {
    bar(arg2, self) {
      log(`right.obj0.bar ${arg2} ${self === obj0}`);
      return 3;
    },
  };
  return harden(obj0);
}

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  log(`right.setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
