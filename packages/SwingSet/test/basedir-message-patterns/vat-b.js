import { Far } from '@endo/far';
import { buildPatterns } from '../message-patterns.js';

export function buildRootObject(vatPowers) {
  const bert = makeExo(
    'bert',
    M.interface('bert', {}, { defaultGuards: 'passable' }),
    {
      toString: () => 'obj-bert',
      log_bert: msg => {
        vatPowers.testLog(msg);
      },
    },
  );
  const bill = makeExo(
    'bill',
    M.interface('bill', {}, { defaultGuards: 'passable' }),
    {
      toString: () => 'obj-bill',
      log_bill(msg) {
        vatPowers.testLog(msg);
      },
    },
  );

  const root = makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      init() {
        const { setB, objB } = buildPatterns(vatPowers.testLog);
        const bob = objB;
        const b = harden({ bob, bert, bill });
        setB(b);
        return harden({ bob, bert });
      },
    },
  );
  return root;
}
