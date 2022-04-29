// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { startPriceAuthority } from '@agoric/vats/src/core/basic-behaviors.js';
import { buildRootObject as priceAuthorityRoot } from '@agoric/vats/src/vat-priceAuthority.js';
import { E } from '@endo/far';
import {
  setupAmm,
  startEconomicCommittee,
  startVaultFactory,
} from '../src/econ-behaviors.js';
import { makeNodeBundleCache } from './bundleTool.js';
import {
  installGovernance,
  setupBootstrap,
  setUpZoeForTest,
} from './supports.js';

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
const test = anyTest;

const vatRoots = {
  priceAuthority: priceAuthorityRoot,
};

const contractRoots = {
  liquidate: './src/vaultFactory/liquidateMinimum.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  amm: './src/vpool-xyk-amm/multipoolMarketMaker.js',
};

const makeTestContext = async () => {
  const bundleCache = await makeNodeBundleCache('bundles/', s => import(s));
  const { zoe, feeMintAccess } = setUpZoeForTest();

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const install = (src, dest) =>
    bundleCache.load(src, dest).then(b => E(zoe).install(b));
  const installation = {
    liquidate: install(contractRoots.liquidate, 'liquidateMinimum'),
    VaultFactory: install(contractRoots.VaultFactory, 'VaultFactory'),
    amm: install(contractRoots.amm, 'amm'),
  };

  return {
    zoe: await zoe,
    feeMintAccess: await feeMintAccess,
    runKit: { brand: runBrand, issuer: runIssuer },
    installation,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

test('users can open vaults', async t => {
  const space = await setupBootstrap(t);

  const loadVat = name => {
    switch (name) {
      case 'priceAuthority': {
        return vatRoots.priceAuthority();
      }
      default:
        throw Error(`not implemented ${name}`);
    }
  };

  const startDevNet = async () => {
    return startPriceAuthority({
      ...space,
      // @ts-expect-error TODO: align types better
      consume: { ...space.consume, loadVat },
    });
  };

  const startRunPreview = async () => {
    const {
      installation: { produce: iProduce },
    } = space;
    iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
    iProduce.liquidate.resolve(t.context.installation.liquidate);
    iProduce.amm.resolve(t.context.installation.amm);

    await Promise.all([
      installGovernance(space.consume.zoe, space.installation.produce),
      startEconomicCommittee(space),
      setupAmm(space),
      startVaultFactory(space),
    ]);
  };

  await startDevNet();
  await startRunPreview();
});
