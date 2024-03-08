import { Far } from '@endo/far';

export function buildRootObject() {
  // eslint-disable-next-line no-unused-vars
  let vatStrongRef;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats, _devices) {
        vatStrongRef = vats;
      },
    },
  );
}
