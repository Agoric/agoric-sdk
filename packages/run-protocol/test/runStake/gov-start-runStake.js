// @ts-check
/* global globalThis */

/**
 * @file Governance proposal to start runStake
 * following swingset-core-eval conventions.
 *
 * swingset-core-eval proposals consist of a JSON permit
 * and a JavaScript script -- not a module; hence
 * the import-by-copy of a number of items here.
 */

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;
const BASIS_POINTS = 10000n;

const runStakeConfig = /** @type {const} */ ({
  installation: {
    boardId: '',
  },
  instance: {
    // agoricdev-8 has getRUN reserved, not runStake
    key: 'getRUN',
  },
  initialValues: {
    debtLimit: 1_000_000_000_000n, // urun
    mintingRatio: /** @type { Rational } */ ([1n, 4n]),
    interestRateBP: 250n,
    loanFeeBP: 200n,
    chargingPeriod: SECONDS_PER_HOUR,
    recordingPeriod: SECONDS_PER_DAY,
  },
});

const AmountMath = {
  /** @type {typeof import('@agoric/ertp').AmountMath.make} */
  make: (brand, value) => harden({ brand, value }),
};

/** @type {typeof import('@endo/far').E} */
const E = globalThis.E;

// import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
const CONTRACT_ELECTORATE = 'Electorate';
const ParamTypes = /** @type {const} */ ({
  AMOUNT: 'amount',
  BRAND: 'brand',
  INSTALLATION: 'installation',
  INSTANCE: 'instance',
  INVITATION: 'invitation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
  UNKNOWN: 'unknown',
});
harden(ParamTypes);

/** @type {typeof import('@agoric/zoe/src/contractSupport/index.js').makeRatio} */
const makeRatio = (vn, bn, vd = 1n, bd = bn) =>
  harden({
    numerator: { brand: bn, value: vn },
    denominator: { brand: bd, value: vd },
  });

// params.js
const PKey = /** @type { const } */ ({
  DebtLimit: 'DebtLimit',
  MintingRatio: 'MintingRatio',
  InterestRate: 'InterestRate',
  LoanFee: 'LoanFee',
});

export const makeRunStakeTerms = (
  { timerService, chargingPeriod, recordingPeriod },
  {
    electorateInvitationAmount,
    debtLimit,
    mintingRatio,
    interestRate,
    loanFee,
  },
) => ({
  timerService,
  chargingPeriod,
  recordingPeriod,
  governedParams: harden({
    [PKey.DebtLimit]: { type: ParamTypes.AMOUNT, value: debtLimit },
    [PKey.MintingRatio]: { type: ParamTypes.RATIO, value: mintingRatio },
    [PKey.InterestRate]: { type: ParamTypes.RATIO, value: interestRate },
    [PKey.LoanFee]: { type: ParamTypes.RATIO, value: loanFee },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  }),
});
harden(makeRunStakeTerms);

/**
 * @param {import('../../src/econ-behaviors.js').RunStakeBootstrapPowers &
 *         { consume: { board: Board }} &
 *         { instance: { produce: { getRUN: Producer<Instance> }}}
 * } powers
 * @param {Object} config
 * @param {bigint} config.debtLimit
 * @param {Rational} config.mintingRatio ratio of RUN minted to BLD
 * @param {bigint} config.interestRateBP
 * @param {bigint} config.loanFeeBP
 * @param {bigint} config.chargingPeriod
 * @param {bigint} config.recordingPeriod
 * @typedef {[bigint, bigint]} Rational
 * @typedef {Awaited<ReturnType<typeof import('../../src/runStake/runStake.js').start>>} StartRunStake
 */
const startRunStake = async (
  {
    consume: {
      board,
      zoe,
      // ISSUE: is there some reason Zoe shouldn't await this???
      feeMintAccess: feeMintAccessP,
      lienBridge,
      client,
      chainTimerService,
      economicCommitteeCreatorFacet,
    },
    // @ts-ignore TODO: add to BootstrapPowers
    produce: { runStakeCreatorFacet, runStakeGovernorCreatorFacet },
    installation: {
      consume: { contractGovernor },
    },
    instance: {
      consume: { economicCommittee },
      produce: { [runStakeConfig.instance.key]: runStakeinstanceR },
    },
    brand: {
      consume: { BLD: bldBrandP, RUN: runBrandP },
      produce: { Attestation: attestationBrandR },
    },
    issuer: {
      consume: { BLD: bldIssuer },
      produce: { Attestation: attestationIssuerR },
    },
  },
  config = runStakeConfig.initialValues,
) => {
  const [feeMintAccess, bldBrand, runBrand, governor, installation, timer] =
    await Promise.all([
      feeMintAccessP,
      bldBrandP,
      runBrandP,
      contractGovernor,
      E(board).getValue(runStakeConfig.installation.boardId),
      chainTimerService,
    ]);

  const installations = {
    governor,
    getRUN: installation,
  };

  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const runStakeTerms = makeRunStakeTerms(
    {
      timerService: timer,
      chargingPeriod: config.chargingPeriod,
      recordingPeriod: config.recordingPeriod,
    },
    {
      debtLimit: AmountMath.make(runBrand, 1_000_000_000_000n),
      mintingRatio: makeRatio(
        config.mintingRatio[0],
        runBrand,
        config.mintingRatio[1],
        bldBrand,
      ),
      interestRate: makeRatio(config.interestRateBP, runBrand, BASIS_POINTS),
      loanFee: makeRatio(config.loanFeeBP, runBrand, BASIS_POINTS),
      electorateInvitationAmount,
    },
  );

  /** @type {{ publicFacet: GovernorPublic, creatorFacet: GovernedContractFacetAccess<unknown>}} */
  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    {},
    {
      timer,
      economicCommittee,
      governedContractInstallation: installations.getRUN,
      governed: harden({
        terms: runStakeTerms,
        issuerKeywordRecord: { Stake: bldIssuer },
        privateArgs: { feeMintAccess, initialPoserInvitation, lienBridge },
      }),
    },
    harden({ economicCommitteeCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const creatorFacet = E(governorFacets.creatorFacet).getCreatorFacet();

  const {
    issuers: { Attestation: attIssuer },
    brands: { Attestation: attBrand },
  } = await E(zoe).getTerms(governedInstance);

  runStakeCreatorFacet.resolve(creatorFacet);
  runStakeGovernorCreatorFacet.resolve(governorFacets.creatorFacet);
  runStakeinstanceR.resolve(governedInstance);
  attestationBrandR.resolve(attBrand);
  attestationIssuerR.resolve(attIssuer);
  return Promise.all([
    E(client).assignBundle([
      address => ({
        attMaker: E(creatorFacet).provideAttestationMaker(address),
      }),
    ]),
  ]);
};
harden(startRunStake);

// "export" our behavior by way of the completion value of this script.
startRunStake;
