import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  const other = Far('other', {
    something(arg) {
      return arg;
    },
  });

  function behave(mode) {
    if (mode === 'data') {
      return 'a big hello to all intelligent lifeforms everywhere';
    } else if (mode === 'presence') {
      return other;
    } else if (mode === 'reject') {
      throw Error('gratuitous error');
    }
    return undefined;
  }

  return Far('root', {
    bootstrap(_vats) {
      return behave(vatParameters.argv[0]);
    },
    extra(mode) {
      return behave(mode);
    },
  });
}
