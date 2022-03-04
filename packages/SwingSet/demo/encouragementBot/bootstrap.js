import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

console.log('=> loading bootstrap.js');

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  log('=> buildRootObject called');
  return Far('root', {
    bootstrap(vats) {
      log('=> bootstrap() called');
      E(vats.user)
        .talkToBot(vats.bot, 'encouragementBot')
        .then(
          r =>
            log(
              `=> the promise given by the call to user.talkToBot resolved to '${r}'`,
            ),
          err =>
            log(
              `=> the promise given by the call to user.talkToBot was rejected '${err}''`,
            ),
        );
    },
  });
}
