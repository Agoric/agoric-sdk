import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  const root = {
    bootstrap(vats) {
      log('tildot');
      const input = 'x~.foo(y)';
      const out = vatPowers.transformTildot(input);
      log(out);
      vats.bootstrap~.call('ok');
    },

    call(arg) {
      log(arg);
    },
  };
  return Far('root', root);
}
