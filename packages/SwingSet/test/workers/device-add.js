import { Far } from '@endo/far';

export function buildRootDeviceNode() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      add(x, y) {
        return x + y;
      },
    },
  );
}
