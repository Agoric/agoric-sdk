// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../src/types.js';

import path from 'path';
import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { AmountMath } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeLoopback } from '@agoric/captp';
import { governedParameterTerms } from '../src/params.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const stablecoinRoot = `${dirname}/../src/stablecoinMachine.js`;
const liquidationRoot = `${dirname}/../src/liquidateMinimum.js`;
const autoswapRoot =
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap.js';
const governanceRoot = '@agoric/governance/src/contractGovernor.js';
const electorateRoot = '@agoric/governance/src/committee.js';

async function makeBundle(sourceRoot) {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const contractBundle = await bundleSource(new URL(url).pathname);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
}

// makeBundle is slow, so we bundle each contract once and reuse in all tests.
const [
  autoswapBundle,
  stablecoinBundle,
  liquidationBundle,
  governanceBundle,
  electorateBundle,
] = await Promise.all([
  makeBundle(autoswapRoot),
  makeBundle(stablecoinRoot),
  makeBundle(liquidationRoot),
  makeBundle(governanceRoot),
  makeBundle(electorateRoot),
]);

function installBundle(zoe, contractBundle) {
  return E(zoe).install(contractBundle);
}

const setupGovernor = async (
  zoe,
  electorateInstall,
  electorateTerms,
  governedContractInstallation,
  governanceInstall,
  governed,
  timer,
) => {
  const {
    instance: electorateInstance,
    creatorFacet: electorateCreatorFacet,
  } = await E(zoe).startInstance(electorateInstall, {}, electorateTerms);

  const governorTerms = {
    electorateInstance,
    timer,
    governedContractInstallation,
    governed,
  };
  return E(zoe).startInstance(
    governanceInstall,
    {},
    governorTerms,
    harden({ electorateCreatorFacet }),
  );
};

const setUpZoeForTest = async setJig => {
  const { makeFar, makeNear } = makeLoopback('zoeTest');
  let isFirst = true;
  function makeRemote(arg) {
    const result = isFirst ? makeNear(arg) : arg;
    // this seems fragile. It relies on one contract being created first by Zoe
    isFirst = !isFirst;
    return result;
  }

  /**
   * These properties will be assigned by `setJig` in the contract.
   *
   * @typedef {Object} TestContext
   * @property {ContractFacet} zcf
   * @property {IssuerRecord} runIssuerRecord
   * @property {IssuerRecord} govIssuerRecord
   * @property {ERef<MultipoolAutoswapPublicFacet>} autoswap
   */

  const {
    zoeService: nonFarZoeService,
    feeMintAccess: nonFarFeeMintAccess,
  } = makeZoeKit(makeFakeVatAdmin(setJig, makeRemote).admin);
  const feePurse = E(nonFarZoeService).makeFeePurse();
  const zoeService = await E(nonFarZoeService).bindDefaultFeePurse(feePurse);
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

test('bootstrap payment', async t => {
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { zoe, feeMintAccess } = await setUpZoeForTest(setJig);

  const autoswapInstall = await installBundle(zoe, autoswapBundle);
  const stablecoinInstall = await installBundle(zoe, stablecoinBundle);
  const liquidationInstall = await installBundle(zoe, liquidationBundle);
  const electorateInstall = await installBundle(zoe, electorateBundle);
  const governanceInstall = await installBundle(zoe, governanceBundle);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);

  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;
  const treasuryTerms = {
    autoswapInstall,
    priceAuthority: Promise.resolve(),
    loanParams,
    timerService: manualTimer,
    liquidationInstall,
    governedParams: governedParameterTerms,
    bootstrapPaymentValue,
  };
  const governed = {
    terms: treasuryTerms,
    issuerKeywordRecord: {},
    privateArgs: { feeMintAccess },
  };

  const electorateTerms = { committeeName: 'bandOfAngels', committeeSize: 5 };
  const { creatorFacet } = await setupGovernor(
    zoe,
    electorateInstall,
    electorateTerms,
    stablecoinInstall,
    governanceInstall,
    governed,
    manualTimer,
  );

  const bootstrapPayment = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  const { runIssuerRecord } = testJig;

  const bootstrapAmount = await E(runIssuerRecord.issuer).getAmountOf(
    bootstrapPayment,
  );

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runIssuerRecord.brand, bootstrapPaymentValue),
    ),
  );
});

test('bootstrap payment - only minted once', async t => {
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { zoe, feeMintAccess } = await setUpZoeForTest(setJig);

  const autoswapInstall = await installBundle(zoe, autoswapBundle);
  const stablecoinInstall = await installBundle(zoe, stablecoinBundle);
  const liquidationInstall = await installBundle(zoe, liquidationBundle);
  const electorateInstall = await installBundle(zoe, electorateBundle);
  const governanceInstall = await installBundle(zoe, governanceBundle);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);

  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;

  const treasuryTerms = {
    autoswapInstall,
    priceAuthority: Promise.resolve(),
    loanParams,
    timerService: manualTimer,
    liquidationInstall,
    governedParams: governedParameterTerms,
    bootstrapPaymentValue,
  };
  const governed = {
    terms: treasuryTerms,
    issuerKeywordRecord: {},
    privateArgs: { feeMintAccess },
  };

  const electorateTerms = { committeeName: 'bandOfAngels', committeeSize: 5 };
  const { creatorFacet } = await setupGovernor(
    zoe,
    electorateInstall,
    electorateTerms,
    stablecoinInstall,
    governanceInstall,
    governed,
    manualTimer,
  );

  const bootstrapPayment = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  const { runIssuerRecord } = testJig;
  const issuers = { RUN: runIssuerRecord.issuer };

  const claimedPayment = await E(issuers.RUN).claim(bootstrapPayment);
  const bootstrapAmount = await E(issuers.RUN).getAmountOf(claimedPayment);

  const runBrand = await E(issuers.RUN).getBrand();

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
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { zoe, feeMintAccess } = await setUpZoeForTest(setJig);

  const autoswapInstall = await installBundle(zoe, autoswapBundle);
  const stablecoinInstall = await installBundle(zoe, stablecoinBundle);
  const liquidationInstall = await installBundle(zoe, liquidationBundle);
  const electorateInstall = await installBundle(zoe, electorateBundle);
  const governanceInstall = await installBundle(zoe, governanceBundle);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);

  const electorateTerms = { committeeName: 'bandOfAngels', committeeSize: 5 };

  const treasuryTerms = {
    autoswapInstall,
    priceAuthority: Promise.resolve(),
    loanParams,
    timerService: manualTimer,
    liquidationInstall,
    governedParams: governedParameterTerms,
  };
  const governed = {
    terms: treasuryTerms,
    issuerKeywordRecord: {},
    privateArgs: { feeMintAccess },
  };

  const { creatorFacet } = await setupGovernor(
    zoe,
    electorateInstall,
    electorateTerms,
    stablecoinInstall,
    governanceInstall,
    governed,
    manualTimer,
  );

  const { runIssuerRecord } = testJig;
  const issuers = { RUN: runIssuerRecord.issuer };

  const bootstrapPayment = E(
    E(creatorFacet).getCreatorFacet(),
  ).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  const runBrand = await E(issuers.RUN).getBrand();

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});
