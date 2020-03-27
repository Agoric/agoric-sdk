import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';
// eslint-disable-next-line import/no-unresolved, import/extensions
import dvpBundle from './bundle-dvp';

const setupBasicMints = () => {
  const all = [
    produceIssuer('assuranceByCarol', 'strSet'),
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
};

const makeVats = (E, log, vats, zoe, installations, startingExtents) => {
  const { mints, issuers, amountMaths } = setupBasicMints();
  const makePayments = extents =>
    mints.map((mint, i) => mint.mintPayment(amountMaths[i].make(extents[i])));
  const [aliceExtents, bobExtents, carolExtents, daveExtents] = startingExtents;

  // Setup Bob
  const bobP = E(vats.bob).build(
    zoe,
    issuers,
    makePayments(bobExtents),
    installations,
  );

  // Setup Carol
  const carolP = E(vats.carol).build(
    zoe,
    issuers,
    makePayments(carolExtents),
    installations,
    mints[0], // carol gets the ability to mint assurances
  );

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    issuers,
    makePayments(aliceExtents),
    installations,
    carolP,
  );

  const dvpCoreP = E(vats.dvpCore).build(
    zoe,
    issuers,
    makePayments(daveExtents),
    installations,
  );

  log(`=> alice, bob, carol, and dvpCore are set up`);
  return harden({ aliceP, bobP, carolP, dvpCoreP });
};

function build(E, log) {
  const obj0 = {
    async bootstrap(argv, vats) {
      const zoe = await E(vats.zoe).getZoe();

      const installations = {
        dvp: await E(zoe).install(dvpBundle.source, dvpBundle.moduleFormat),
      };
      const [testName, startingExtents] = argv;

      const { aliceP, bobP, carolP, dvpCoreP } = makeVats(
        E,
        log,
        vats,
        zoe,
        installations,
        startingExtents,
      );
      await E(dvpCoreP).startTest(testName, aliceP, bobP, carolP);
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
export default harden(setup);
