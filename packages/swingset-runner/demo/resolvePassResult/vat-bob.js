import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  return Far('root', {
    first() {
      log('=> Bob: in first');
      return `Bob's first answer`;
    },
    second(p) {
      log('=> Bob: second begins');
      p.then(
        r => log(`=> Bob: the parameter to second resolved to '${r}'`),
        e => log(`=> Bob: the parameter to second rejected as '${e}'`),
      );
      log('=> Bob: second done');
      return `Bob's second answer`;
    },
  });
}
