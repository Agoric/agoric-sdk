/* eslint-env node */
/**
 * @file The goal of this file is to make sure v28-provisionPool and v14-bank can be successfully
 * upgraded. These vats are related because of the issues below;
 * - https://github.com/Agoric/agoric-sdk/issues/8722
 * - https://github.com/Agoric/agoric-sdk/issues/8724
 *
 * The test scenario is as follows;
 * - Prerequisite: provisionPool and bank are already upgraded. See `upgrade.go`
 * 1. Add a new account and successfully provision it
 *  - Observe new account's address under `published.wallet.${address}`
 * 2. Send some USDC_axl to provisionPoolAddress and observe its IST balances increases accordingly
 * 3. Introduce a new asset to the chain and start a PSM instance for the new asset
 * 3a. Deposit some of that asset to provisionPoolAddress
 * 3b. Observe provisionPoolAddress' IST balance increase by the amount deposited in step 3a
 */

import '@endo/init';
import test from 'ava';
import { execFileSync } from 'node:child_process';
import {
  addUser,
  makeAgd,
  evalBundles,
  agd as agdAmbient,
  agoric,
  bankSend,
  getISTBalance,
} from '@agoric/synthetic-chain';
import { NonNullish } from './test-lib/errors.js';
import {
  retryUntilCondition,
  waitUntilAccountFunded,
  waitUntilContractDeployed,
} from './test-lib/sync-tools.js';

const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

const ADD_PSM_DIR = 'addUsdLemons';
const DEPOSIT_USD_LEMONS_DIR = 'depositUSD-LEMONS';

const USDC_DENOM = NonNullish(process.env.USDC_DENOM);

const agd = makeAgd({ execFileSync }).withOpts({ keyringBackend: 'test' });

const ambientAuthority = {
  query: agdAmbient.query,
  follow: agoric.follow,
  setTimeout,
};

const provision = (name, address) =>
  agd.tx(['swingset', 'provision-one', name, address, 'SMART_WALLET'], {
    chainId: 'agoriclocal',
    from: 'validator',
    yes: true,
  });

const introduceAndProvision = async name => {
  const address = await addUser(name);
  console.log('ADDR', name, address);

  const provisionP = provision(name, address);

  return { provisionP, address };
};

const getProvisionedAddresses = async () => {
  const { children } = await agd.query([
    'vstorage',
    'children',
    'published.wallet',
  ]);
  return children;
};

const checkUserProvisioned = addr =>
  retryUntilCondition(
    getProvisionedAddresses,
    children => children.includes(addr),
    'Account not provisioned',
    { maxRetries: 5, retryIntervalMs: 1000, log: console.log, setTimeout },
  );

test(`upgrade provision pool`, async t => {
  // Introduce new user then provision
  const { address } = await introduceAndProvision('provisionTester');
  await checkUserProvisioned(address);

  // Send USDC_axl to pp
  const istBalanceBefore = await getISTBalance(PROVISIONING_POOL_ADDR);
  await bankSend(PROVISIONING_POOL_ADDR, `500000${USDC_DENOM}`);

  // Check IST balance
  await waitUntilAccountFunded(
    PROVISIONING_POOL_ADDR,
    ambientAuthority,
    { denom: 'uist', value: istBalanceBefore + 500000 },
    { errorMessage: 'Provision pool not able to swap USDC_axl for IST.' },
  );

  // Introduce USD_LEMONS
  await evalBundles(ADD_PSM_DIR);
  await waitUntilContractDeployed('psm-IST-USD_LEMONS', ambientAuthority, {
    errorMessage: 'psm-IST-USD_LEMONS instance not observed.',
  });

  // Provision the provisionPoolAddress. This is a workaround of provisionPoolAddress
  // not having a depositFacet published to namesByAddress. Shouldn't be a problem since
  // vat-bank keeps track of virtual purses per address basis. We need there to be
  // depositFacet for provisionPoolAddress since we'll fund it with USD_LEMONS
  await provision('provisionPoolAddress', PROVISIONING_POOL_ADDR);
  await checkUserProvisioned(PROVISIONING_POOL_ADDR);

  // Send USD_LEMONS to provisionPoolAddress
  const istBalanceBeforeLemonsSent = await getISTBalance(
    PROVISIONING_POOL_ADDR,
  );
  await evalBundles(DEPOSIT_USD_LEMONS_DIR);

  // Check balance again
  await waitUntilAccountFunded(
    PROVISIONING_POOL_ADDR,
    ambientAuthority,
    { denom: 'uist', value: istBalanceBeforeLemonsSent + 500000 },
    { errorMessage: 'Provision pool not bale swap USDC_axl for IST.' },
  );
  t.pass();
});
