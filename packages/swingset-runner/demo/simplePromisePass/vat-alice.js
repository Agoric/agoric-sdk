import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

const log = console.log;

export function buildRootObject() {
  return Far('root', {
    sendPromiseTo(other) {
      log('=> Alice: sendPromiseTo() begins');
      const { promise, resolve } = makePromiseKit();
      const response = E(other).thisIsYourPromise(promise);
      resolve('Alice says hi!');
      response.then(
        r => log(`=> Alice: response to thisIsYourPromise resolved to '${r}'`),
        e => log(`=> Alice: response to thisIsYourPromise rejected as '${e}'`),
      );
      log('=> Alice: sendPromiseTo() done');
      return 'Alice started';
    },
  });
}
