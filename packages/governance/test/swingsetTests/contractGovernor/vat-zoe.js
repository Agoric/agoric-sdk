// @ts-check

import { Far } from '@agoric/marshal';

import { makeZoe } from '@agoric/zoe';

export const buildRootObject = _vatPowers =>
  Far('root', {
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc),
  });
