// Copyright (C) 2018 Agoric, under Apache License 2.0
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeSpawner } from '@agoric/spawner';

function buildRootObject() {
  return Far('root', {
    buildSpawner(vatAdminSvc) {
      const spawnBundleCapP = E(vatAdminSvc).getNamedBundleCap('spawn');
      return makeSpawner(vatAdminSvc, spawnBundleCapP);
    },
  });
}
harden(buildRootObject);
export { buildRootObject };

/** @typedef {ReturnType<typeof buildRootObject>} SpawnerVat */
