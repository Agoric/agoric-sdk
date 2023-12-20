import test from 'ava';

import { agd } from '../cliHelper.js';
import { ATOM_DENOM, CHAINID, GOV1ADDR, SDK_ROOT } from '../constants.js';
import {
  installBundles,
  runZcfUpgrade,
  runProber,
  addUser,
  getISTBalance,
} from './actions.js';
import { mintIST, openVault } from '../econHelpers.js';
import { waitForBlock } from '../commonUpgradeHelpers.js';

test.before(async t => {
  await mintIST(GOV1ADDR, 12340000000, 10000, 2000);

  await waitForBlock(2);
  const userAddress = await addUser('user-auto');
  await agd.tx(
    'bank',
    'send',
    'gov1',
    userAddress,
    `1000000uist,2100000000${ATOM_DENOM}`,
    '--from',
    GOV1ADDR,
    '--chain-id',
    CHAINID,
    '--keyring-backend',
    'test',
    '--yes',
  );
  t.context = { userAddress };
  await waitForBlock(2);

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

test('Open Vaults with auto-provisioned wallet', async t => {
  const { userAddress } = /** @type {{ userAddress: string }} */ (t.context);
  t.is(await getISTBalance(userAddress), 1);

  const ATOMGiven = 2000;
  const ISTWanted = 400;
  await openVault(userAddress, ISTWanted, ATOMGiven);

  await waitForBlock(2);

  const newISTBalance = await getISTBalance(userAddress);
  console.log('New IST Balance in u13 account:', newISTBalance);
  t.true(newISTBalance >= ISTWanted, 'Got the wanted IST');
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
