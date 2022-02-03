import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

/* eslint-disable-next-line import/no-unresolved, import/extensions */
import exchangeBundle from './bundle-simpleExchange.js';

export function buildRootObject(_vatPowers, vatParameters) {
  let alice;
  let bob;
  let round = 0;
  let quiet = false;

  return Far('root', {
    async bootstrap(vats, devices) {
      let primeContracts = false;
      for (const arg of vatParameters.argv) {
        if (arg === '--prime') {
          primeContracts = true;
        } else if (arg === '--quiet') {
          quiet = true;
        }
      }

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
      const brands = all.map(objs => objs.brand);

      function makePayments(values) {
        return mints.map((mint, i) =>
          mint.mintPayment(AmountMath.make(brands[i], values[i])),
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
      if (primeContracts) {
        await E(alice).initiateTrade(bob, quiet);
        await E(bob).initiateTrade(alice, quiet);
      }
    },
    async runBenchmarkRound() {
      round += 1;
      if (round % 2) {
        await E(alice).initiateTrade(bob, quiet);
        return `round ${round} (alice->bob) complete`;
      } else {
        await E(bob).initiateTrade(alice, quiet);
        return `round ${round} (bob->alice) complete`;
      }
    },
  });
}
