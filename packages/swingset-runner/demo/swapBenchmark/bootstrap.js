import { makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makePrintLog } from './printLog';

/* eslint-disable-next-line import/no-unresolved, import/extensions */
import atomicSwapBundle from './bundle-atomicSwap';

const log = makePrintLog();

function setupBasicMints() {
  // prettier-ignore
  const all = [
    makeIssuerKit('moola'),
    makeIssuerKit('simoleans'),
  ];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const amountMaths = all.map(objs => objs.amountMath);

  return harden({
    mints,
    issuers,
    amountMaths,
  });
}

function makeVats(vats, zoe, installations, startingValues) {
  const { mints, issuers, amountMaths } = setupBasicMints();
  // prettier-ignore
  function makePayments(values) {
    return mints.map((mint, i) => mint.mintPayment(amountMaths[i].make(values[i])));
  }
  const [aliceValues, bobValues] = startingValues;

  // Setup Alice
  const alice = E(vats.alice).build(
    zoe,
    issuers,
    makePayments(aliceValues),
    installations,
  );

  // Setup Bob
  const bob = E(vats.bob).build(
    zoe,
    issuers,
    makePayments(bobValues),
    installations,
  );

  const result = {
    alice,
    bob,
  };

  log(`=> alice and bob are set up`);
  return harden(result);
}

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

      const installations = {
        atomicSwap: await E(zoe).install(atomicSwapBundle.bundle),
      };

      const startingValues = [
        [3, 0], // Alice: 3 moola, no simoleans
        [0, 3], // Bob:   no moola, 3 simoleans
      ];

      ({ alice, bob } = makeVats(vats, zoe, installations, startingValues));
      // Zoe appears to do some one-time setup the first time it's used, so this
      // is a sacrifical benchmark round to prime the pump.
      if (vatParameters.argv[0] === '--prime') {
        await E(alice).initiateSwap(bob);
        await E(bob).initiateSwap(alice);
      }
    },
    async runBenchmarkRound() {
      round += 1;
      await E(alice).initiateSwap(bob);
      await E(bob).initiateSwap(alice);
      return `round ${round} complete`;
    },
  });
}
