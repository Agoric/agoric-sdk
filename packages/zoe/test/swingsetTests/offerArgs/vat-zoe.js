import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc),
  });
}
