// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

function makeAliceMaker(E, _host, _log) {
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

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker(host) {
        return harden(makeAliceMaker(E, host, log));
      },
    }),
  );
}
export default harden(setup);
