import { Far } from '@endo/marshal';

export function buildRootObject() {
  console.log(`idle vat initializing`);
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      doNothing() {},
    },
  );
}
