import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  const thing = makeExo(
    'thing',
    M.interface('thing', {}, { defaultGuards: 'passable' }),
    {
      second() {
        log('=> Bob: in thing.second(), reply with string');
        return `Bob's second answer`;
      },
    },
  );
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      first() {
        log('=> Bob: in first(), reply with thing');
        return thing;
      },
    },
  );
}
