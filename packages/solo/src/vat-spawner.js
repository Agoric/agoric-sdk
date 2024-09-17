// Copyright (C) 2018 Agoric, under Apache License 2.0
import { makeSpawner } from '@agoric/spawner';
import { Far } from '@endo/marshal';

function buildRootObject() {
  return Far('root', {
    buildSpawner(vatAdminSvc) {
      return makeSpawner(vatAdminSvc);
    },
  });
}
harden(buildRootObject);
export { buildRootObject };
