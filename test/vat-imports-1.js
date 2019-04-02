import harden from '@agoric/harden';

function build(E, log) {
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
      } else if (argv[0] === 'evaluate') {
        log('evaluate-1');
        // eslint-disable-next-line global-require
        const evaluate = require('@agoric/evaluate');
        log(evaluate('1+2'));
        log(evaluate('a+b', { a: 0, b: 4 }));
        log(evaluate('(a) => a+b', { b: 3 })(2));
      }
    },
  };
  return harden(obj0);
}

export default function setup(syscall, state, helpers) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(syscall, state, E => build(E, log), helpers.vatID);
}
