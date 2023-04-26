import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  log(`=> setup called`);
  return Far('root', {
    bootstrap(vats) {
      log('=> Alice: bootstrap() called');

      log('Alice: sending first() to Bob');
      const p1 = E(vats.bob).first();
      log('Alice: sending second to result of first()');
      const p2 = E(p1).second(p1);
      log(`Alice: awaiting responses to second()`);
      p1.then(
        r => log(`=> Alice: Bob's response to first() resolved to '${r}'`),
        e => log(`=> Alice: Bobs' response to first() rejected as '${e}'`),
      );
      p2.then(
        r => log(`=> Alice: response to second() resolved to '${r}'`),
        e => log(`=> Alice: response to second() rejected as '${e}'`),
      );
      log('=> Alice: bootstrap() done');
      return 'Alice started';
    },
  });
}
