import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  log(`=> setup called`);
  return Far('root', {
    bootstrap(vats) {
      log('=> Alice: bootstrap() called');

      let resolver;
      const param = new Promise((theResolver, _theRejector) => {
        resolver = theResolver;
      });
      log('Alice: resolving the promise that will be sent to Bob');
      resolver('Alice says hi!');
      log(`Alice: sending the promise to Bob and awaiting Bob's response`);
      const response = E(vats.bob).thisIsYourPromise(param);
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
