import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  const thing = Far('thing', {
    second() {
      log('=> Bob: in thing.second(), reply with string');
      return `Bob's second answer`;
    },
  });
  return Far('root', {
    first() {
      log('=> Bob: in first(), reply with thing');
      return thing;
    },
  });
}
