// Copyright (C) 2019 Agoric, under Apache License 2.0

import { assert } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

function makeSpawner(vatAdminSvc, spawnBundleCapP = undefined) {
  const spawnBundleRefP =
    spawnBundleCapP || E(vatAdminSvc).getNamedBundleCap('spawn');
  return Far('spawner', {
    install(bundle, oldModuleFormat) {
      assert(!oldModuleFormat, 'oldModuleFormat not supported');
      return Far('installer', {
        async spawn(argsP) {
          const meter = await E(vatAdminSvc).createUnlimitedMeter();
          const opts = { name: 'spawn', meter };
          const spawnBundleRef = await spawnBundleRefP;
          const { root } = await E(vatAdminSvc).createVat(spawnBundleRef, opts);
          return E(E(root).loadBundle(bundle)).start(argsP);
        },
      });
    },
  });
}
harden(makeSpawner);

export { makeSpawner };
