// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';

function makeAliceMaker() {
  return harden({
    make(sharingServiceP) {
      const alice = harden({
        shareSomething(someKey) {
          return E(sharingServiceP)
            .createSharedMap(someKey)
            .then(sharedMap => E(sharedMap).addEntry(someKey, 42));
        },
      });
      return alice;
    },
  });
}

export function buildRootObject(_vatPowers) {
  return harden({
    makeAliceMaker(_host) {
      return harden(makeAliceMaker());
    },
  });
}
