import test from 'ava';

import { agd } from '@agoric/synthetic-chain/src/lib/cliHelper.js';
import {
  ATOM_DENOM,
  CHAINID,
  GOV1ADDR,
} from '@agoric/synthetic-chain/src/lib/constants.js';
import {
  mintIST,
  getISTBalance,
  openVault,
} from '@agoric/synthetic-chain/src/lib/econHelpers.js';
import {
  waitForBlock,
  addUser,
} from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';

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
});

test('Open Vaults with auto-provisioned wallet', async t => {
  const { userAddress } = /** @type {{userAddress: string}} */ (t.context);
  t.is(await getISTBalance(userAddress), 1);

  const ATOMGiven = 2000;
  const ISTWanted = 400;
  await openVault(userAddress, ISTWanted, ATOMGiven);

  await waitForBlock(2);

  const newISTBalance = await getISTBalance(userAddress);
  t.log('New IST Balance in user-auto account:', newISTBalance);
  t.true(newISTBalance >= ISTWanted, 'Got the wanted IST');
});
