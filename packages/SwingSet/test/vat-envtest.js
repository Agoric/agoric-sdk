// @ts-nocheck
/* global VatData */
import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(_vats) {
        log(`control sample: ${typeof notThere}`);
        log(`harden: ${typeof harden}`);
        log(`VatData: ${typeof VatData}`);
        for (const prop of Object.keys(VatData)) {
          log(`VatData.${prop}: ${typeof VatData[prop]}`);
        }
      },
    },
  );
}
