import { Far } from '@endo/far';

export function buildRootDeviceNode({
  setDeviceState,
  getDeviceState,
  testLog,
}) {
  testLog(typeof getDeviceState());

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      setState(arg) {
        setDeviceState(arg);
        return 'ok';
      },
      getState() {
        return harden(getDeviceState());
      },
    },
  );
}
