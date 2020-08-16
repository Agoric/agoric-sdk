// noinspection ES6PreferShortImport
import { makeZoe } from '@agoric/zoe';

export function buildRootObject(__vatPowers) {
  return harden({
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc),
  });
}
