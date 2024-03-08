import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  const thing = makeExo(
    'thing',
    M.interface('thing', {}, { defaultGuards: 'passable' }),
    {
      answer() {
        log('=> Bob: in thing.answer1(), reply with string');
        return `Bob's thing answer`;
      },
    },
  );
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      getThing() {
        log('=> Bob: in getThing(), reply with thing');
        return thing;
      },
    },
  );
}
