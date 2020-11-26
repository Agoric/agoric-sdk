// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';

function makeBobMaker() {
  return harden({
    make(sharingServiceP) {
      const bob = harden({
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

export function buildRootObject(_vatPowers) {
  return harden({
    makeBobMaker(_host) {
      return harden(makeBobMaker());
    },
  });
}
