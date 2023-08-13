// Copyright (C) 2018 Agoric, under Apache License 2.0
import { Far } from '@endo/far';
import { makeSpawner } from '@agoric/spawner';

function buildRootObject() {
  return Far('root', {
    buildSpawner(vatAdminSvc) {
      return makeSpawner(vatAdminSvc);
    },
  });
}
harden(buildRootObject);
export { buildRootObject };
