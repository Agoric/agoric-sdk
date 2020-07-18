/* global harden */

export function buildRootObject(_vatPowers) {
  const other = harden({
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
      throw new Error('gratuitous error');
    }
    return undefined;
  }

  return harden({
    bootstrap(argv, _vats) {
      return behave(argv[0]);
    },
    extra(mode) {
      return behave(mode);
    },
  });
}
