// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../src/types.js';

import path from 'path';
import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { AmountMath } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const stablecoinRoot = `${dirname}/../src/stablecoinMachine.js`;
const liquidationRoot = `${dirname}/../src/liquidateMinimum.js`;

const autoswapRootP = importMetaResolve(
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap.js',
  import.meta.url,
).then(url => new URL(url).pathname);

const makeInstall = async (root, zoe) => {
  const bundle = await bundleSource(root);
  // install the contract
  const installationP = E(zoe).install(bundle);
  return installationP;
};

test('bootstrap payment', async t => {
  const { zoeService: zoe, feeMintAccess } = makeZoeKit(fakeVatAdmin);
  const autoswapRoot = await autoswapRootP;
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
    harden({ feeMintAccess }),
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
  const { zoeService: zoe, feeMintAccess } = makeZoeKit(fakeVatAdmin);
  const autoswapRoot = await autoswapRootP;
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
    harden({ feeMintAccess }),
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
  const { zoeService: zoe, feeMintAccess } = makeZoeKit(fakeVatAdmin);
  const autoswapRoot = await autoswapRootP;
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
    harden({ feeMintAccess }),
  );

  const issuers = await E(zoe).getIssuers(instance);

  const bootstrapPayment = E(stablecoinMachine).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  const runBrand = await E(issuers.RUN).getBrand();

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});
