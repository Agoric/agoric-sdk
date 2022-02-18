import { Far } from '@endo/marshal';

export const buildRootObject = (_vatPowers, vatParameters) => {
  const other = Far('other', {
    something: arg => arg,
  });

  const behave = mode => {
    if (mode === 'data') {
      return 'a big hello to all intelligent lifeforms everywhere';
    } else if (mode === 'presence') {
      return other;
    } else if (mode === 'reject') {
      throw new Error('gratuitous error');
    }
    return undefined;
  };

  return Far('root', {
    bootstrap: _vats => behave(vatParameters.argv[0]),
    extra: mode => behave(mode),
  });
};
