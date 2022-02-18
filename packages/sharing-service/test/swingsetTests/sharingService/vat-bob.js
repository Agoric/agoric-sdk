// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

const makeBobMaker = () =>
  Far('bobMaker', {
    make: sharingServiceP => {
      const bob = Far('bob', {
        findSomething: key =>
          E(sharingServiceP)
            .grabSharedMap(key)
            .then(sharedMap => {
              return E(E(sharingServiceP).validate(sharedMap)).lookup(key);
            }),
      });
      return bob;
    },
  });

export const buildRootObject = _vatPowers =>
  Far('root', {
    makeBobMaker: _host => makeBobMaker(),
  });
