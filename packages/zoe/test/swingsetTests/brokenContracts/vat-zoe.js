// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe.js';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const { zoeService: zoe } = makeZoe(vatAdminSvc);
      return zoe;
    },
  });
}
