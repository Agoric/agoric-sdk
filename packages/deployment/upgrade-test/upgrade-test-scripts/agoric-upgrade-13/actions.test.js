import test from 'ava';

import { agops } from '../cliHelper.js';
import { GOV1ADDR } from '../constants.js';
import { adjustVault, closeVault, mintIST, openVault } from '../econHelpers.js';

test.before(async t => {
  await mintIST(GOV1ADDR, 12340000000, 10000, 2000);
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
