import { Far, getInterfaceOf } from '@endo/far';

export function buildRootObject() {
  let counter = 0;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      increment() {
        counter += 1;
      },
      read() {
        return counter;
      },
      remotable() {
        const r = Far('iface1');
        return getInterfaceOf(r);
      },
    },
  );
}
