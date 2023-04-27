// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

function makeBobMaker() {
  return Far('bobMaker', {
    make(sharingServiceP) {
      const bob = Far('bob', {
        findSomething(key) {
          return E(sharingServiceP)
            .grabSharedMap(key)
            .then(sharedMap => {
              return E(E(sharingServiceP).validate(sharedMap)).lookup(key);
            });
        },
      });
      return bob;
    },
  });
}

export function buildRootObject() {
  return Far('root', {
    makeBobMaker(_host) {
      return makeBobMaker();
    },
  });
}
