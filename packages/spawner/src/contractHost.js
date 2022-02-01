// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';
import { Far } from '@endo/marshal';

// spawnBundle is built with 'yarn build'
import spawnBundle from '../bundles/bundle-spawn.js';

function makeSpawner(vatAdminSvc) {
  return Far('spawner', {
    install(bundle, oldModuleFormat) {
      assert(!oldModuleFormat, 'oldModuleFormat not supported');
      return Far('installer', {
        async spawn(argsP) {
          const meter = await E(vatAdminSvc).createUnlimitedMeter();
          const opts = { meter };
          const { root } = await E(vatAdminSvc).createVat(spawnBundle, opts);
          return E(E(root).loadBundle(bundle)).start(argsP);
        },
      });
    },
  });
}
harden(makeSpawner);

export { makeSpawner };
