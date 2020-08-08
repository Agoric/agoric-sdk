// Copyright (C) 2019 Agoric, under Apache License 2.0

/* global harden */
import { E } from '@agoric/eventual-send';

function makeBobMaker() {
  return harden({
    make(sharingServiceE) {
      const bob = harden({
        findSomething(key) {
          return E(sharingServiceE)
            .grabSharedMap(key)
            .then(sharedMap => {
              return E(E(sharingServiceE).validate(sharedMap)).lookup(key);
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
