// @ts-check

/* global require __dirname */

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import '../src/types';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import { makeZoe } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { AmountMath } from '@agoric/ertp';
import { governedParameterTerms } from '../src/params';

const stablecoinRoot = `${__dirname}/../src/stablecoinMachine.js`;
const liquidationRoot = `${__dirname}/../src/liquidateMinimum.js`;

const autoswapRoot = require.resolve(
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap',
);
const governanceRoot = require.resolve(
  '@agoric/governance/src/contractGovernor',
);
const registrarRoot = require.resolve(
  '@agoric/governance/src/committeeRegistrar',
);

const makeInstall = async (root, zoe) => {
  const bundle = await bundleSource(root);
  // install the contract
  const installationP = E(zoe).install(bundle);
  return installationP;
};

const setupGovernor = async (
  zoe,
  registrarInstall,
  registrarTerms,
  governanceInstall,
) => {
  const { instance: registrarInstance } = await E(zoe).startInstance(
    registrarInstall,
    {},
    registrarTerms,
  );

  const governorTerms = { registrarInstance };
  const { instance: governorInstance } = await E(zoe).startInstance(
    governanceInstall,
    {},
    governorTerms,
  );
  return governorInstance;
};

test('bootstrap payment', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);
  const registrarInstall = await makeInstall(registrarRoot, zoe);
  const governanceInstall = await makeInstall(governanceRoot, zoe);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);

  const registrarTerms = { committeeName: 'bandOfAngels', committeeSize: 5 };
  const governorInstance = await setupGovernor(
    zoe,
    registrarInstall,
    registrarTerms,
    governanceInstall,
  );

  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;
  const { creatorFacet: stablecoinMachine, instance } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: Promise.resolve(),
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
      electionManager: governorInstance,
      governedParams: governedParameterTerms,

      bootstrapPaymentValue,
    },
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(
    E(stablecoinMachine).getLimitedCreatorFacet(),
  ).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  const runBrand = await E(issuers.RUN).getBrand();

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runBrand, bootstrapPaymentValue),
    ),
  );
});

test('bootstrap payment - only minted once', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);
  const registrarInstall = await makeInstall(registrarRoot, zoe);
  const governanceInstall = await makeInstall(governanceRoot, zoe);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);

  const registrarTerms = { committeeName: 'bandOfAngels', committeeSize: 5 };
  const governorInstance = await setupGovernor(
    zoe,
    registrarInstall,
    registrarTerms,
    governanceInstall,
  );

  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;
  const { creatorFacet: stablecoinMachine, instance } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: Promise.resolve(),
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
      electionManager: governorInstance,
      governedParams: governedParameterTerms,

      bootstrapPaymentValue,
    },
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(
    E(stablecoinMachine).getLimitedCreatorFacet(),
  ).getBootstrapPayment();

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
    E(stablecoinMachine).getLimitedCreatorFacet(),
  ).getBootstrapPayment();

  await t.throwsAsync(() => E(issuers.RUN).claim(bootstrapPayment2), {
    message: 'payment not found for "RUN"',
  });
});

test('bootstrap payment - default value is 0n', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);
  const registrarInstall = await makeInstall(registrarRoot, zoe);
  const governanceInstall = await makeInstall(governanceRoot, zoe);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);

  const registrarTerms = { committeeName: 'bandOfAngels', committeeSize: 5 };
  const governorInstance = await setupGovernor(
    zoe,
    registrarInstall,
    registrarTerms,
    governanceInstall,
  );

  const { creatorFacet: stablecoinMachine, instance } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: Promise.resolve(),
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
      electionManager: governorInstance,
      governedParams: governedParameterTerms,
    },
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(
    E(stablecoinMachine).getLimitedCreatorFacet(),
  ).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  const runBrand = await E(issuers.RUN).getBrand();

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});
