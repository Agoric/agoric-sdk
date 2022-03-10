import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject(_vatPowers) {
  return Far('root', {
    sayHelloTo(other) {
      log(`=> Alice.sayHelloTo`);
      const answer = E(other).hello();
      answer.then(
        r => log(`=> alice.hello() answer resolved to '${r}'`),
        e => log(`=> alice.hello() answer rejected as '${e}'`),
      );
      return `Alice started\n`;
    },
  });
}
