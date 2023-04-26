import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  return Far('root', {
    thisIsYourPromise(parr) {
      const p = parr[0];
      log('=> Bob: thisIsYourPromise begins');
      p.then(
        r => log(`=> Bob: the promise parameter resolved to '${r}'`),
        e => log(`=> Bob: the promise parameter rejected as '${e}'`),
      );
      log('=> Bob: thisIsYourPromise done');
      return 'Bob got the promise';
    },
  });
}
