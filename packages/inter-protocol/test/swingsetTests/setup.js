import { E } from '@endo/eventual-send';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeGovernedTerms as makeVaultFactoryTerms } from '../../src/vaultFactory/params';
import { ammMock } from './mockAmm';
import { liquidationDetailTerms } from '../../src/vaultFactory/liquidation';

const ONE_DAY = 24n * 60n * 60n;
const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;
const BASIS_POINTS = 10000n;

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

const installContracts = async (zoe, cb) => {
  const [liquidateMinimum, vaultFactory, electorate, counter, governor] =
    await Promise.all([
      E(zoe).install(cb.liquidateMinimum),
      E(zoe).install(cb.vaultFactory),
      E(zoe).install(cb.committee),
      E(zoe).install(cb.binaryVoteCounter),
      E(zoe).install(cb.contractGovernor),
    ]);

  const installations = {
    liquidateMinimum,
    vaultFactory,
    electorate,
    counter,
    governor,
  };
  return installations;
};

/**
 * Provide initial values for governed vault manager params.
 *
 * @param {Brand<'nat'>} debtBrand
 * @returns {VaultManagerParamValues}
 */
const makeRates = debtBrand => {
  return {
    debtLimit: AmountMath.make(debtBrand, 1_000_000n),
    liquidationMargin: makeRatio(105n, debtBrand),
    liquidationPenalty: makeRatio(10n, debtBrand, 100n, debtBrand),
    interestRate: makeRatio(250n, debtBrand, BASIS_POINTS),
    loanFee: makeRatio(200n, debtBrand, BASIS_POINTS),
  };
};

const startElectorate = async (zoe, installations) => {
  const electorateTerms = harden({
    committeeName: 'TwentyCommittee',
    committeeSize: 5,
  });
  const { creatorFacet: electorateCreatorFacet, instance: electorateInstance } =
    await E(zoe).startInstance(
      installations.electorate,
      harden({}),
      electorateTerms,
    );
  return { electorateCreatorFacet, electorateInstance };
};

/**
 *
 * @param {import('@agoric/governance/src/committee.js').CommitteeElectorateCreatorFacet} electorateCreatorFacet
 * @param {*} voterCreator
 * @returns {Promise<unknown[]>}
 */
const createCommittee = async (electorateCreatorFacet, voterCreator) => {
  const invitations = await E(electorateCreatorFacet).getVoterInvitations();

  const floraP = E(voterCreator).createVoter('Flora', invitations[0]);
  const bobP = E(voterCreator).createVoter('Bob', invitations[1]);
  const carolP = E(voterCreator).createVoter('Carol', invitations[2]);
  const daveP = E(voterCreator).createVoter('Dave', invitations[3]);
  const emmaP = E(voterCreator).createVoter('Emma', invitations[4]);
  return Promise.all([bobP, carolP, daveP, emmaP, floraP]);
};

const makeVats = async (
  log,
  vats,
  zoe,
  installations,
  startingValues,
  feeMintAccess,
) => {
  const timer = buildManualTimer(console.log, 0n, {
    timeStep: ONE_DAY,
  });
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

  const { electorateCreatorFacet, electorateInstance } = await startElectorate(
    zoe,
    installations,
  );

  // Setup Owner
  const {
    governor,
    governed: vaultFactory,
    runBrand,
  } = await E(vats.owner).build(
    zoe,
    issuers,
    brands,
    makePayments(ownerValues),
    installations,
    timer,
    vats.priceAuthority,
    feeMintAccess,
    electorateInstance,
    electorateCreatorFacet,
    // reserve,
  );

  log(`=> alice and the vaultFactory are set up`);
  return {
    aliceP,
    governor,
    vaultFactory,
    runBrand,
    timer,
    electorateCreatorFacet,
    electorateInstance,
    brands,
  };
};

/**
 * @param {(msg: any)=> void} log
 * @param {ZoeService} zoe
 * @param {unknown[]} issuers
 * @param {Brand[]} brands
 * @param {Payment[]} payments
 * @param {*} installations
 * @param {ManualTimer} timer
 * @param {*} priceAuthorityVat
 * @param {*} feeMintAccess
 * @param {*} electorateInstance
 * @param {*} electorateCreatorFacet
 */
const buildOwner = async (
  log,
  zoe,
  issuers,
  brands,
  payments,
  installations,
  timer,
  priceAuthorityVat,
  feeMintAccess,
  electorateInstance,
  electorateCreatorFacet,
) => {
  const [moolaBrand] = brands;
  const [moolaIssuer] = issuers;
  const runBrand = await E(E(zoe).getFeeIssuer()).getBrand();

  const vaultManagerParams = makeRates(runBrand);

  const loanTiming = {
    chargingPeriod: SECONDS_PER_DAY,
    recordingPeriod: SECONDS_PER_DAY,
  };

  const priceAuthorityKit = await E(priceAuthorityVat).makePriceAuthority();

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const [initialPoserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  /** @type {AssetReservePublicFacet} */
  // @ts-expect-error cast, never used
  const reservePublicFacet = null;
  /** @type {Amount} */
  // @ts-expect-error cast, never used
  const shortfallInvitationAmount = null;

  const terms = makeVaultFactoryTerms(
    // @ts-expect-error missing storageNode and marshaller
    {},
    {
      priceAuthority: priceAuthorityKit.priceAuthority,
      loanTiming,
      liquidationInstall: installations.liquidateMinimum,
      timer,
      electorateInvitationAmount: poserInvitationAmount,
      ammPublicFacet: ammMock,
      liquidationTerms: liquidationDetailTerms(runBrand),
      minInitialDebt: AmountMath.make(runBrand, 100n),
      bootstrapPaymentValue: 0n,
      reservePublicFacet,
      shortfallInvitationAmount,
    },
  );

  const privateVaultFactoryArgs = { feeMintAccess, initialPoserInvitation };

  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    harden({}),
    harden({
      timer,
      governedContractInstallation: installations.vaultFactory,
      governed: {
        terms,
        issuerKeywordRecord: {},
      },
    }),
    { governed: privateVaultFactoryArgs },
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const governedPublicFacet = E(zoe).getPublicFacet(governedInstance);

  await E(E(governorFacets.creatorFacet).getCreatorFacet()).addVaultType(
    moolaIssuer,
    'Moola',
    vaultManagerParams,
  );

  const QUOTE_INTERVAL = 24n * 60n * 60n;
  const moolaPriceAuthority = await E(priceAuthorityVat).makeFakePriceAuthority(
    harden({
      actualBrandIn: moolaBrand,
      actualBrandOut: runBrand,
      priceList: [100000n, 120000n, 110000n, 80000n],
      timer,
      quoteInterval: QUOTE_INTERVAL,
    }),
  );

  await E(priceAuthorityKit.adminFacet).registerPriceAuthority(
    moolaPriceAuthority,
    moolaBrand,
    runBrand,
  );

  const governed = {
    instance: governedInstance,
    creatorFacet: E(governorFacets.creatorFacet).getCreatorFacet(),
    publicFacet: governedPublicFacet,
  };

  return { governor: governorFacets, governed, runBrand };
};

harden(buildOwner);
harden(makeRates);
harden(setupBasicMints);
harden(ONE_DAY);
harden(createCommittee);
harden(startElectorate);
harden(installContracts);
harden(makeVats);

export {
  buildOwner,
  makeRates,
  setupBasicMints,
  ONE_DAY,
  createCommittee,
  startElectorate,
  installContracts,
  makeVats,
};
