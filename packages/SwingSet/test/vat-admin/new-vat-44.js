import { Far, E } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  const { adder } = vatParameters;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      getANumber() {
        return E(adder).add1(43);
      },
    },
  );
}
