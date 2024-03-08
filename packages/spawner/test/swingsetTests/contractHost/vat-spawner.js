// Copyright (C) 2018 Agoric, under Apache License 2.0
import { Far } from '@endo/marshal';
import { makeSpawner } from '../../../src/contractHost.js';

function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      buildSpawner(vatAdminSvc) {
        return makeSpawner(vatAdminSvc);
      },
    },
  );
}
harden(buildRootObject);
export { buildRootObject };
