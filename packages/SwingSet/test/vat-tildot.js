import harden from '@agoric/harden';

function build(E, log, vatPowers) {
  const root = {
    bootstrap(argv, vats) {
      log('tildot');
      const input = 'x~.foo(y)';
      const out = vatPowers.transformTildot(input);
      log(out);
      vats._bootstrap~.call('ok');
    },

    call(arg) {
      log(arg);
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers, vatPowers) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(syscall, state, (E, _D, vatPowers) => build(E, log, vatPowers), helpers.vatID, vatPowers);
}
