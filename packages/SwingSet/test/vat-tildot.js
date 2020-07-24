/* global harden */

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
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
