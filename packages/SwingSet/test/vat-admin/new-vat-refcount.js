import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  const { held } = vatParameters;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      foo: () => held, // hold until root goes away
    },
  );
}
