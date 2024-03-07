import { Far } from '@endo/far';

export function buildRootDeviceNode() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      pleaseThrow(msg) {
        throw Error(`intentional: ${msg}`);
      },
    },
  );
}
