// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

const makeAliceMaker = () =>
  Far('aliceMaker', {
    make: sharingServiceP => {
      const alice = Far('alice', {
        shareSomething: someKey =>
          E(sharingServiceP)
            .createSharedMap(someKey)
            .then(sharedMap => E(sharedMap).addEntry(someKey, 42)),
      });
      return alice;
    },
  });

export const buildRootObject = _vatPowers =>
  Far('root', {
    makeAliceMaker: _host => makeAliceMaker(),
  });
