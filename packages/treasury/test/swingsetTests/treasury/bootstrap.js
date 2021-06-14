// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';

const ONE_DAY = 24n * 60n * 60n;

const setupBasicMints = () => {
  const all = [makeIssuerKit('moola')];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const brands = all.map(objs => objs.brand);

  return harden({
    mints,
    issuers,
    brands,
  });
};

const startRegistrar = async (zoe, installations) => {
  const registrarTerms = { committeeName: 'TwentyCommittee', committeeSize: 5 };
  const {
    creatorFacet: committeeCreator,
    instance: registrarInstance,
  } = await E(zoe).startInstance(installations.registrar, {}, registrarTerms);
  return { committeeCreator, registrarInstance };
};

const makeVats = async (log, vats, zoe, installations, startingValues) => {
  const timer = buildManualTimer(console.log, 0n, ONE_DAY);
  const { mints, issuers, brands } = setupBasicMints();
  const makePayments = values =>
    mints.map((mint, i) =>
      mint.mintPayment(AmountMath.make(values[i], brands[i])),
    );
  const [aliceValues, ownerValues] = startingValues;

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    brands,
    makePayments(aliceValues),
    timer,
  );

  const { committeeCreator } = await startRegistrar(zoe, installations);

  // Setup Owner
  const treasuryPublicFacet = E(vats.owner).build(
    zoe,
    issuers,
    brands,
    makePayments(ownerValues),
    installations,
    timer,
    vats.priceAuthority,
    committeeCreator,
  );

  const result = { aliceP, treasuryPublicFacet };

  log(`=> alice and the treasury are set up`);
  return harden(result);
};

function makeBootstrap(argv, cb, vatPowers) {
  return async (vats, devices) => {
    const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
      devices.vatAdmin,
    );
    const zoe = E(vats.zoe).buildZoe(vatAdminSvc);
    const [
      liquidateMinimum,
      autoswap,
      treasury,
      registrar,
      counter,
      governor,
    ] = await Promise.all([
      E(zoe).install(cb.liquidateMinimum),
      E(zoe).install(cb.autoswap),
      E(zoe).install(cb.treasury),
      E(zoe).install(cb.committeeRegistrar),
      E(zoe).install(cb.binaryBallotCounter),
      E(zoe).install(cb.contractGovernor),
    ]);

    const installations = {
      liquidateMinimum,
      autoswap,
      treasury,
      registrar,
      counter,
      governor,
    };

    const [testName, startingValues] = argv;
    const { aliceP, treasuryPublicFacet } = await makeVats(
      vatPowers.testLog,
      vats,
      zoe,
      installations,
      startingValues,
    );

    await E(aliceP).startTest(testName, treasuryPublicFacet);
  };
}

export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
}
