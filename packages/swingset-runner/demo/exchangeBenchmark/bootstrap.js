import { makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

/* eslint-disable-next-line import/no-unresolved, import/extensions */
import exchangeBundle from './bundle-simpleExchange';

export function buildRootObject(_vatPowers, vatParameters) {
  let alice;
  let bob;
  let round = 0;
  return harden({
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const zoe = await E(vats.zoe).buildZoe(vatAdminSvc);

      const exchange = await E(zoe).install(exchangeBundle.bundle);

      const grubStake = [
        [3, 0], // Alice: 3 moola, no simoleans
        [0, 3], // Bob:   no moola, 3 simoleans
      ];

      const all = [makeIssuerKit('moola'), makeIssuerKit('simoleans')];
      const mints = all.map(objs => objs.mint);
      const issuers = all.map(objs => objs.issuer);
      const amountMaths = all.map(objs => objs.amountMath);

      function makePayments(values) {
        return mints.map((mint, i) =>
          mint.mintPayment(amountMaths[i].make(values[i])),
        );
      }

      const [alicePayments, bobPayments] = grubStake.map(v => makePayments(v));

      const [moolaIssuer, simoleanIssuer] = issuers;
      const issuerKeywordRecord = harden({
        Price: simoleanIssuer,
        Asset: moolaIssuer,
      });
      const { publicFacet } = await E(zoe).startInstance(
        exchange,
        issuerKeywordRecord,
      );

      alice = E(vats.alice).build(zoe, issuers, alicePayments, publicFacet);
      bob = E(vats.bob).build(zoe, issuers, bobPayments, publicFacet);

      // Zoe appears to do some one-time setup the first time it's used, so this
      // is an optional, sacrifical benchmark round to prime the pump.
      if (vatParameters.argv[0] === '--prime') {
        await E(alice).initiateTrade(bob);
        await E(bob).initiateTrade(alice);
      }
    },
    async runBenchmarkRound() {
      round += 1;
      await E(alice).initiateTrade(bob);
      await E(bob).initiateTrade(alice);
      return `round ${round} complete`;
    },
  });
}
