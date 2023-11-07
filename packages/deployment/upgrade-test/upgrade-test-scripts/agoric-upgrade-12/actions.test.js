import test from 'ava';

import { agd, agoric, agops } from '../cliHelper.js';
import { GOV1ADDR, SDK_ROOT } from '../constants.js';
import { installBundles, runZcfUpgrade, runProber } from './actions.js';
import { adjustVault, closeVault, mintIST, openVault } from '../econHelpers.js';

test.before(async t => {
  await mintIST(GOV1ADDR, 12340000000, 10000, 2000);

  const bundlesData = [
    {
      name: 'Zcf-upgrade',
      filePath: `${SDK_ROOT}/packages/zoe/src/contractFacet/vatRoot.js`,
    },
    {
      name: 'Zoe-upgrade',
      filePath: `${SDK_ROOT}/packages/vats/src/vat-zoe.js`,
    },
    {
      name: 'prober-contract',
      filePath: `${SDK_ROOT}/packages/boot/test/bootstrapTests/zcfProbe.js`,
    },
  ];

  // @ts-expect-error
  t.context.bundleIds = await installBundles(bundlesData);
});

test.skip('Open Vaults', async t => {
  const currentVaults = await agops.vaults('list', '--from', GOV1ADDR);
  t.is(currentVaults.length, 5);

  // TODO get as return value from openVault
  const vaultId = 'vault6';
  await openVault(GOV1ADDR, 7, 11);
  await adjustVault(GOV1ADDR, vaultId, { giveMinted: 1.5 });
  await adjustVault(GOV1ADDR, vaultId, { giveCollateral: 2.0 });
  await closeVault(GOV1ADDR, vaultId, 5.75);
});

test.skip('Run Prober (first time)', async t => {
  // @ts-expect-error
  await runProber(t.context.bundleIds['prober-contract']);
  const data = await agd.query('vstorage', 'data', 'published.prober-asid9a');
  const value = JSON.parse(data.value);
  t.is(value.values[0], 'false');
});

test.skip('Upgrade Zoe and ZCF', async t => {
  await runZcfUpgrade(
    // @ts-expect-error
    t.context.bundleIds['Zcf-upgrade'],
    // @ts-expect-error
    t.context.bundleIds['Zoe-upgrade'],
  );

  t.pass();
});

test.skip('Run Prober (second time)', async t => {
  // @ts-expect-error
  await runProber(t.context.bundleIds['prober-contract']);

  const data = await agd.query('vstorage', 'data', 'published.prober-asid9a');
  const value = JSON.parse(data.value);
  t.is(value.values[0], 'true');
});
