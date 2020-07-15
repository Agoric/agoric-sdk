/* global harden */

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoe';

export function buildRootObject(_vatPowers) {
  return harden({
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc),
  });
}
