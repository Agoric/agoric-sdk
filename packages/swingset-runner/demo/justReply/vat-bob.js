import { Far } from '@endo/marshal';

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      hello() {
        console.log(`=> Somebody said hello to Bob`);
        return 'hi there!';
      },
    },
  );
}
