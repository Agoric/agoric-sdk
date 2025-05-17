// @ts-nocheck
/* global VatData globalThis */
import { Far } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';
import { PassStyleOfEndowmentSymbol } from '@endo/pass-style/endow.js';
import { importBundle } from '@endo/import-bundle';

export function meta() {
  return { globalThis, passStyleOf };
}

const endowments = {
  console,
  // See https://github.com/Agoric/agoric-sdk/issues/9515
  assert: globalThis.assert,
  VatData: globalThis.VatData,
};

export async function recurse(bundle) {
  return importBundle(bundle, { endowments });
}

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;
  const { argv } = vatParameters;
  const [bundle] = argv;

  return Far('root', {
    async bootstrap(_vats) {
      log(`control sample: ${typeof notThere}`);
      log(`harden: ${typeof harden}`);
      log(`VatData: ${typeof VatData}`);
      for (const prop of Object.keys(VatData)) {
        log(`VatData.${prop}: ${typeof VatData[prop]}`);
      }
      const globalPassStyleOf =
        globalThis && globalThis[PassStyleOfEndowmentSymbol];
      log(`global has passStyleOf: ${!!globalPassStyleOf}`);
      // we expect globalPassStyleOf and passStyleOf to be the same
      // thing, because @endo/pass-style delegates to the version it
      // finds on globalThis
      const d1 = globalPassStyleOf === passStyleOf;
      log(`passStyleOf delegates to global: ${d1}`);

      // make sure sub-compartments automatically get passStyleOf too
      const c1 = await importBundle(bundle, { endowments });
      const m1 = c1.meta().passStyleOf === passStyleOf;
      log(`child compartment has matching passStyleOf: ${m1}`);

      const c2 = await c1.recurse(bundle);
      const m2 = c2.meta().passStyleOf === passStyleOf;
      log(`grandchild compartment has matching passStyleOf: ${m2}`);
    },
  });
}
