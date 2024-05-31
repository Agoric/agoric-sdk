// @ts-nocheck
/* global VatData */
import { Far } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';
import { PassStyleOfEndowmentSymbol } from '@endo/pass-style/endow.js';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;

  return Far('root', {
    bootstrap(_vats) {
      log(`control sample: ${typeof notThere}`);
      log(`harden: ${typeof harden}`);
      log(`VatData: ${typeof VatData}`);
      for (const prop of Object.keys(VatData)) {
        log(`VatData.${prop}: ${typeof VatData[prop]}`);
      }
      const globalPassStyleOf = globalThis && globalThis[PassStyleOfEndowmentSymbol];
      log(`global has passStyleOf: ${!!globalPassStyleOf}`);
      log(`global passStyleOf is special: ${globalPassStyleOf !== passStyleOf}`);
    },
  });
}
