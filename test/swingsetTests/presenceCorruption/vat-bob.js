// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

function makeBobMaker(E, _host, log) {
  return harden({
    make(myMoneyPurseP) {
      const moneyIssuerP = E(myMoneyPurseP).getIssuer();
      const TenSimoleans = E(E(moneyIssuerP).getAssay()).make(10);
      TenSimoleans.then(
        () => log('++ Expect creation of purse'),
        () => log('++ Rejection is a surprise.'),
      );
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
