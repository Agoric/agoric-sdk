import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';
import { makePrintLog } from './printLog';

/* eslint-disable import/no-unresolved, import/extensions */
import simpleExchangeBundle from './bundle-simpleExchange';
/* eslint-enable import/no-unresolved, import/extensions */

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
  return harden({
    async bootstrap(_argv, vats) {
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
    },
    async runBenchmarkRound() {
      await E(alice).initiateSimpleExchange(bob);
      await E(bob).initiateSimpleExchange(alice);
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
