import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  log(`=> setup called`);
  return Far('root', {
    bootstrap(vats) {
      log('=> Alice: bootstrap() called');
      const thingP = E(vats.bob).getThing();
      log('=> Alice: called bob.getThing()');
      E(thingP)
        .answer()
        .then(
          r => {
            log(`=> Alice: thing.answer #1 resolved to '${r}'`);
            E(thingP)
              .answer()
              .then(
                r2 => log(`=> Alice: thing.answer #2 resolved to '${r2}'`),
                e => log(`=> Alice: thing.answer #2 rejected as '${e}'`),
              );
          },
          e => log(`=> Alice: thing.answer #1 rejected as '${e}'`),
        );
      log('=> Alice: bootstrap() done');
      return 'Alice started';
    },
  });
}
