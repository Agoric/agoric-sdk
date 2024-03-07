import { Far } from '@endo/marshal';

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      acceptPromise(_p) {
        console.log('Alice got p');
      },
    },
  );
}
