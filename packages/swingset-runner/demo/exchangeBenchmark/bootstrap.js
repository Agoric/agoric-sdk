/* global harden */

import produceIssuer from '@agoric/ertp';
import { makePrintLog } from './printLog';

/* eslint-disable-next-line import/no-unresolved, import/extensions */
import simpleExchangeBundle from './bundle-simpleExchange';

function setupBasicMints() {
  // prettier-ignore
  const all = [
    produceIssuer('moola'),
    produceIssuer('simoleans'),
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

function makeVats(E, log, vats, zoe, installations, startingExtents) {
  const { mints, issuers, amountMaths } = setupBasicMints();
  // prettier-ignore
  function makePayments(extents) {
    return mints.map((mint, i) => mint.mintPayment(amountMaths[i].make(extents[i])));
  }
  const [aliceExtents, bobExtents] = startingExtents;

  // Setup Alice
  const alice = E(vats.alice).build(
    zoe,
    issuers,
    makePayments(aliceExtents),
    installations,
  );

  // Setup Bob
  const bob = E(vats.bob).build(
    zoe,
    issuers,
    makePayments(bobExtents),
    installations,
  );

  const result = {
    alice,
    bob,
  };

  log(`=> alice and bob are set up`);
  return harden(result);
}

function build(E, log) {
  let alice;
  let bob;
  let round = 0;
  return harden({
    async bootstrap(argv, vats) {
      const zoe = await E(vats.zoe).getZoe();

      const installations = {
        simpleExchange: await E(zoe).install(
          simpleExchangeBundle.source,
          simpleExchangeBundle.moduleFormat,
        ),
      };

      const startingExtents = [
        [3, 0], // Alice: 3 moola, no simoleans
        [0, 3], // Bob:   no moola, 3 simoleans
      ];

      ({ alice, bob } = makeVats(
        E,
        log,
        vats,
        zoe,
        installations,
        startingExtents,
      ));
      // Zoe appears to do some one-time setup the first time it's used, so this
      // is a sacrifical benchmark round to prime the pump.
      if (argv[0] === '--prime') {
        await E(alice).initiateSimpleExchange(bob);
        await E(bob).initiateSimpleExchange(alice);
      }
    },
    async runBenchmarkRound() {
      round += 1;
      await E(alice).initiateSimpleExchange(bob);
      await E(bob).initiateSimpleExchange(alice);
      log(`=> end of benchmark round ${round}`);
      return `round ${round} complete`;
    },
  });
}

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, makePrintLog(helpers.log)),
    helpers.vatID,
  );
}
export default harden(setup);
