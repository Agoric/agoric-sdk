/* global harden */

function build(E, log) {
  const obj0 = {
    bootstrap(argv, _vats) {
      if (argv[0] === 'harden') {
        log('harden-1');
        const o1 = { o2: {} };
        harden(o1);
        log(Object.isFrozen(o1));
        log(Object.isFrozen(o1.o2));
      }
    },
  };
  return harden(obj0);
}

export default function setup(syscall, state, helpers) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(syscall, state, E => build(E, log), helpers.vatID);
}
