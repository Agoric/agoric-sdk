import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  log(`=> setup called`);
  return Far('root', {
    bootstrap(vats) {
      log('=> Alice: bootstrap() called');

      const { promise, resolve } = makePromiseKit();
      log('Alice: sending the promise to Bob');
      const response = E(vats.bob).thisIsYourPromise(promise);
      log('Alice: resolving the promise that was sent to Bob');
      resolve('Alice says hi!');
      log(`Alice: awaiting Bob's response`);
      // prettier-ignore
      response.then(
        r => log(`=> Alice: Bob's response to thisIsYourPromise resolved to '${r}'`),
        e => log(`=> Alice: Bobs' response to thisIsYourPromise rejected as '${e}'`),
      );
      log('=> Alice: bootstrap() done');
      return 'Alice started';
    },
  });
}
