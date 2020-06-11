import harden from '@agoric/harden';

function build(E, log) {
  const root = {
    bootstrap(argv, vats) {
      log('tildot');
      vats._bootstrap~.call('ok');
    },

    call(arg) {
      log(arg);
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(syscall, state, E => build(E, log), helpers.vatID);
}
