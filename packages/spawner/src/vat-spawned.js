/* global globalThis VatData */

import { importBundle } from '@endo/import-bundle';
import { Far } from '@endo/marshal';

const endowments = {
  VatData,
  console,
  assert,
  Base64: globalThis.Base64, // Present only on XSnap
  URL: globalThis.URL, // Absent only on XSnap
};

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async loadBundle(bundle) {
        const ns = await importBundle(bundle, { endowments });
        const startFn = ns.default;
        return makeExo(
          'spawned bundle',
          M.interface('spawned bundle', {}, { defaultGuards: 'passable' }),
          {
            async start(argsP) {
              const args = await argsP;
              return startFn(args);
            },
          },
        );
      },
    },
  );
}
