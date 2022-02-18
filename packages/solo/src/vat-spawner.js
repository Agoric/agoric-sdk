// Copyright (C) 2018 Agoric, under Apache License 2.0
import { Far } from '@endo/marshal';
import { makeSpawner } from '@agoric/spawner';

const buildRootObject = () =>
  Far('root', {
    buildSpawner: vatAdminSvc => makeSpawner(vatAdminSvc),
  });
harden(buildRootObject);
export { buildRootObject };
