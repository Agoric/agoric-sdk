import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, _vatParameters) {
  // console.log(`extra: ${vatParameters.name}`);
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      ping() {},
    },
  );
}
