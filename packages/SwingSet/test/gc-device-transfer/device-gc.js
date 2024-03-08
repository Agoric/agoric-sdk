import { Far } from '@endo/far';

export function buildRootDeviceNode({ setDeviceState }) {
  let stash;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      set(arg) {
        setDeviceState(arg);
        stash = arg;
      },
      get() {
        return stash;
      },
    },
  );
}
