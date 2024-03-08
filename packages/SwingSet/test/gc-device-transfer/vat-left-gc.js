import { Far } from '@endo/far';

export function buildRootObject() {
  return makeExo(
    'left',
    M.interface('left', {}, { defaultGuards: 'passable' }),
    {
      async forget(_amy) {
        // just drop the argument
      },
    },
  );
}
