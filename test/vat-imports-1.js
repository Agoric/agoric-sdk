import harden from '@agoric/harden';

export default function setup(syscall, helpers) {
  const { log, makeLiveSlots } = helpers;
  const { dispatch, registerRoot } = makeLiveSlots(syscall, helpers.vatID);
  const obj0 = {
    bootstrap(argv, _vats) {
      if (argv[0] === 'nat') {
        log('nat-1');
        // eslint-disable-next-line global-require
        const nat = require('@agoric/nat');
        log(nat(2));
      } else if (argv[0] === 'harden') {
        log('harden-1');
        // eslint-disable-next-line global-require
        const harden2 = require('@agoric/harden');
        const o1 = { o2: {} };
        harden2(o1);
        log(Object.isFrozen(o1));
        log(Object.isFrozen(o1.o2));
      }
    },
  };

  registerRoot(harden(obj0));
  return dispatch;
}
