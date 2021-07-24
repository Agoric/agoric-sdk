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

const stablecoinRoot = `${__dirname}/../src/stablecoinMachine.js`;
const liquidationRoot = `${__dirname}/../src/liquidateMinimum.js`;
const autoswapRoot = require.resolve(
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap',
);

const makeInstall = async (root, zoe) => {
  const bundle = await bundleSource(root);
  // install the contract
  const installationP = E(zoe).install(bundle);
  return installationP;
};

test('bootstrap payment', async t => {
  const { zoeService: zoe } = makeZoe(fakeVatAdmin);
  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);
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

      bootstrapPaymentValue,
    },
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(stablecoinMachine).getBootstrapPayment();

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
  const { zoeService: zoe } = makeZoe(fakeVatAdmin);
  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);
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

      bootstrapPaymentValue,
    },
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(stablecoinMachine).getBootstrapPayment();

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

  const bootstrapPayment2 = E(stablecoinMachine).getBootstrapPayment();

  await t.throwsAsync(() => E(issuers.RUN).claim(bootstrapPayment2), {
    message: 'payment not found for "RUN"',
  });
});

test('bootstrap payment - default value is 0n', async t => {
  const { zoeService: zoe } = makeZoe(fakeVatAdmin);
  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);
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
    },
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(stablecoinMachine).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  const runBrand = await E(issuers.RUN).getBrand();

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});
