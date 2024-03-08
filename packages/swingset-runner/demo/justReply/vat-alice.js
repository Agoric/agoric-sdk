import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      sayHelloTo(other) {
        log(`=> Alice.sayHelloTo`);
        const answer = E(other).hello();
        answer.then(
          r => log(`=> alice.hello() answer resolved to '${r}'`),
          e => log(`=> alice.hello() answer rejected as '${e}'`),
        );
        return `Alice started\n`;
      },
    },
  );
}
