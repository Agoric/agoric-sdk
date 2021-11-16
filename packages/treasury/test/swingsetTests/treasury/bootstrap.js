// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

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

const startElectorate = async (zoe, installations) => {
  const electorateTerms = harden({
    committeeName: 'TwentyCommittee',
    committeeSize: 5,
  });
  const {
    creatorFacet: committeeCreator,
    instance: electorateInstance,
  } = await E(zoe).startInstance(
    installations.electorate,
    harden({}),
    electorateTerms,
  );
  return { committeeCreator, electorateInstance };
};

const makeVats = async (
  log,
  vats,
  zoe,
  installations,
  startingValues,
  feeMintAccess,
) => {
  const timer = buildManualTimer(console.log, 0n, ONE_DAY);
  const { mints, issuers, brands } = setupBasicMints();
  const makePayments = values =>
    mints.map((mint, i) =>
      mint.mintPayment(AmountMath.make(brands[i], BigInt(values[i]))),
    );
  const [aliceValues, ownerValues] = startingValues;

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    brands,
    makePayments(aliceValues),
    timer,
  );

  const { committeeCreator, electorateInstance } = await startElectorate(
    zoe,
    installations,
  );

  // Setup Owner
  const treasuryPublicFacet = E(vats.owner).build(
    zoe,
    issuers,
    brands,
    makePayments(ownerValues),
    installations,
    timer,
    vats.priceAuthority,
    feeMintAccess,
    committeeCreator,
    electorateInstance,
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
    const { zoe, feeMintAccess } = await E(vats.zoe).buildZoe(vatAdminSvc);
    const [
      liquidateMinimum,
      autoswap,
      treasury,
      electorate,
      counter,
      governor,
    ] = await Promise.all([
      E(zoe).install(cb.liquidateMinimum),
      E(zoe).install(cb.autoswap),
      E(zoe).install(cb.treasury),
      E(zoe).install(cb.committee),
      E(zoe).install(cb.binaryVoteCounter),
      E(zoe).install(cb.contractGovernor),
    ]);

    const installations = {
      liquidateMinimum,
      autoswap,
      treasury,
      electorate,
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
      feeMintAccess,
    );

    await E(aliceP).startTest(testName, treasuryPublicFacet);
  };
}

export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
}
