// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../../src/vaultFactory/types.js';

import path from 'path';
import { E } from '@agoric/eventual-send';
import bundleSource from '@endo/bundle-source';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { AmountMath } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeLoopback } from '@endo/captp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import {
  makeLoanParams,
  makeElectorateParams,
} from '../../src/vaultFactory/params.js';

const BASIS_POINTS = 10_000n;

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);

const vaultFactoryRoot = `${dirname}/../../src/vaultFactory/vaultFactory.js`;
const liquidationRoot = `${dirname}/../../src/vaultFactory/liquidateMinimum.js`;
const autoswapRoot = `${dirname}/../../src/vpool-xyk-amm/multipoolMarketMaker.js`;
const governanceRoot = '@agoric/governance/src/contractGovernor.js';
const electorateRoot = '@agoric/governance/src/committee.js';

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const contractBundle = await bundleSource(new URL(url).pathname);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
};

// makeBundle is slow, so we bundle each contract once and reuse in all tests.
const [
  autoswapBundle,
  vaultFactoryBundle,
  liquidationBundle,
  governanceBundle,
  electorateBundle,
] = await Promise.all([
  makeBundle(autoswapRoot),
  makeBundle(vaultFactoryRoot),
  makeBundle(liquidationRoot),
  makeBundle(governanceRoot),
  makeBundle(electorateRoot),
]);

const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

const setUpZoeForTest = async setJig => {
  const { makeFar } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

const makeRates = runBrand =>
  harden({
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate: makeRatio(100n, runBrand, BASIS_POINTS),
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
  });

const startTreasury = async (
  manualTimer,
  bootstrapPaymentValue,
  electorateTerms,
) => {
  const { zoe, feeMintAccess } = await setUpZoeForTest(() => {});
  const runIssuer = E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const autoswapInstall = await installBundle(zoe, autoswapBundle);
  const vaultFactoryInstall = await installBundle(zoe, vaultFactoryBundle);
  const liquidationInstall = await installBundle(zoe, liquidationBundle);
  const electorateInstall = await installBundle(zoe, electorateBundle);
  const governanceInstall = await installBundle(zoe, governanceBundle);

  const {
    instance: electorateInstance,
    creatorFacet: electorateCreatorFacet,
  } = await E(zoe).startInstance(
    electorateInstall,
    harden({}),
    electorateTerms,
  );

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  /** @type {LoanTiming} */
  const loanTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const rates = makeRates(runBrand);
  const loanParamTerms = makeLoanParams(loanTiming, rates);

  const treasuryTerms = {
    autoswapInstall,
    liquidationInstall,
    manualTimer,
    bootstrapPaymentValue,
    main: makeElectorateParams(poserInvitationAmount),
    loanParams: loanParamTerms,
  };
  const governed = {
    terms: treasuryTerms,
    issuerKeywordRecord: {},
    privateArgs: { feeMintAccess, initialPoserInvitation: poserInvitation },
  };

  const governorTerms = {
    electorateInstance,
    timer: manualTimer,
    governedContractInstallation: vaultFactoryInstall,
    governed,
  };

  const { creatorFacet } = await E(zoe).startInstance(
    governanceInstall,
    harden({}),
    governorTerms,
    harden({ electorateCreatorFacet }),
  );

  return { runIssuer, creatorFacet, runBrand };
};

test('bootstrap payment', async t => {
  const bootstrapPaymentValue = 20000n * 10n ** 6n;
  const {
    runIssuer,
    creatorFacet,
    runBrand,
  } = await startTreasury(
    buildManualTimer(console.log),
    bootstrapPaymentValue,
    { committeeName: 'bandOfAngels', committeeSize: 5 },
  );

  const bootstrapPayment = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  const bootstrapAmount = await E(runIssuer).getAmountOf(bootstrapPayment);

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runBrand, bootstrapPaymentValue),
    ),
  );
});

test('bootstrap payment - only minted once', async t => {
  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;

  const {
    runIssuer,
    creatorFacet,
    runBrand,
  } = await startTreasury(
    buildManualTimer(console.log),
    bootstrapPaymentValue,
    { committeeName: 'bandOfAngels', committeeSize: 5 },
  );

  const bootstrapPayment = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  const issuers = { RUN: runIssuer };

  const claimedPayment = await E(issuers.RUN).claim(bootstrapPayment);
  const bootstrapAmount = await E(issuers.RUN).getAmountOf(claimedPayment);

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runBrand, bootstrapPaymentValue),
    ),
  );

  // Try getting another payment

  const bootstrapPayment2 = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  await t.throwsAsync(() => E(issuers.RUN).claim(bootstrapPayment2), {
    message: /was not a live payment/,
  });
});

test('bootstrap payment - default value is 0n', async t => {
  const { runIssuer, creatorFacet, runBrand } = await startTreasury(
    buildManualTimer(console.log),
    0n,
    {
      committeeName: 'bandOfAngels',
      committeeSize: 5,
    },
  );

  const issuers = { RUN: runIssuer };

  const bootstrapPayment = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});
