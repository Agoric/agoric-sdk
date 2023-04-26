import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  let resolver;
  return Far('root', {
    first() {
      log('=> Bob: in first');
      const answer = new Promise((theResolver, _theRejector) => {
        resolver = theResolver;
      });
      return answer;
    },
    second(p) {
      log('=> Bob: second begins');
      resolver('Bob answers first in second');
      p.then(
        r => log(`=> Bob: the parameter to second resolved to '${r}'`),
        e => log(`=> Bob: the parameter to second rejected as '${e}'`),
      );
      log('=> Bob: second done');
      return `Bob's second answer`;
    },
  });
}
