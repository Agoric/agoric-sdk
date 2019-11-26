// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

function makeBobMaker(E, _host, _log) {
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

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeBobMaker(host) {
        return harden(makeBobMaker(E, host, log));
      },
    }),
  );
}
export default harden(setup);
