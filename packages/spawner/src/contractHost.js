// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@endo/eventual-send';
import { assert } from '@agoric/assert';
import { Far } from '@endo/marshal';

// spawnBundle is built with 'yarn build'
import spawnBundle from '../bundles/bundle-spawn.js';

function makeSpawner(vatAdminSvc) {
  return makeExo(
    'spawner',
    M.interface('spawner', {}, { defaultGuards: 'passable' }),
    {
      install(bundle, oldModuleFormat) {
        assert(!oldModuleFormat, 'oldModuleFormat not supported');
        return makeExo(
          'installer',
          M.interface('installer', {}, { defaultGuards: 'passable' }),
          {
            async spawn(argsP) {
              const meter = await E(vatAdminSvc).createUnlimitedMeter();
              const opts = { name: 'spawn', meter };
              const { root } = await E(vatAdminSvc).createVat(
                spawnBundle,
                opts,
              );
              return E(E(root).loadBundle(bundle)).start(argsP);
            },
          },
        );
      },
    },
  );
}
harden(makeSpawner);

export { makeSpawner };
