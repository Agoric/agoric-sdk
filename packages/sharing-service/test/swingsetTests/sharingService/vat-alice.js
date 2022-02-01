// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

function makeAliceMaker() {
  return Far('aliceMaker', {
    make(sharingServiceP) {
      const alice = Far('alice', {
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
  return Far('root', {
    makeAliceMaker(_host) {
      return makeAliceMaker();
    },
  });
}
