/* eslint-env node */
/**
 * @file The goal of this file is to make sure v28-provisionPool and v14-bank can be successfully
 * upgraded. These vats are related because of the issues below;
 * - https://github.com/Agoric/agoric-sdk/issues/8722
 * - https://github.com/Agoric/agoric-sdk/issues/8724
 *
 * The test scenario is as follows;
 * 1. Upgrade provisionPool in upgrade.go. This upgrade overrides
 *    provisionWalletBridgerManager with a durable one
 * 2. Add a new account and successfully provision it
 *   - Observe new account's address under `published.wallet.${address}`
 * 3. Send some USDC_axl to provisionPoolAddress and observe its IST balances increases accordingly
 * 4. Introduce a new asset to the chain and start a PSM instance for the new asset
 *   4a. Deposit some of that asset to provisionPoolAddress
 *   4b. Observe provisionPoolAddress' IST balance increase by the amount deposited in step 4a
 * 5. Perform a null upgrade for provisionPool. This upgrade does NOT override provisionWalletBridgerManager
 *   - The goal here is to allow testing the bridgeHandler from the first upgrade is in fact durable
 * 6. Auto provision
 *   6a. Introduce a new account
 *   6b. Fund it with IST and ATOM to be able to open a vault
 *   6c. Try to open a vault WITHOUT provisioning the newly introduced account
 *   6d. Observe the new account's address under `published.wallet`
 * 7. Same as step 2. Checks manual provision works after null upgrade
 *
 * Note: We are also upgrading provisionPool's governor to meet https://github.com/Agoric/agoric-sdk/issues/10411.
 * The governor's behavior is tested at https://github.com/Agoric/agoric-sdk/blob/master/a3p-integration/proposals/z%3Aacceptance/governance.test.js
 */

import '@endo/init';
import test from 'ava';
import {
  addUser,
  evalBundles,
  agd as agdAmbient,
  agoric,
  getISTBalance,
  GOV1ADDR,
  openVault,
  ATOM_DENOM,
} from '@agoric/synthetic-chain';
import {
  makeVstorageKit,
  waitUntilAccountFunded,
  waitUntilContractDeployed,
} from '@agoric/client-utils';
import { NonNullish } from '@agoric/internal';
import {
  bankSend,
  checkUserProvisioned,
  introduceAndProvision,
  provision,
} from '../test-lib/provision-helpers.js';

const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

const ADD_PSM_DIR = 'generated/addUsdLemons';
const DEPOSIT_USD_LEMONS_DIR = 'depositUSD-LEMONS';

const USDC_DENOM = NonNullish(process.env.USDC_DENOM);

const ambientAuthority = {
  query: agdAmbient.query,
  follow: agoric.follow,
  setTimeout,
  log: console.log,
};

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial(
  `check provisionPool can recover purse and asset subscribers after upgrade`,
  async t => {
    // @ts-expect-error casting
    const { vstorageKit } = t.context;

    // Introduce new user then provision
    const { address } = await introduceAndProvision('provisionTester');
    await checkUserProvisioned(address, vstorageKit);

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

    // agoricNames already added USD_LEMONS
    await evalBundles(ADD_PSM_DIR);
    await waitUntilContractDeployed('psm-IST-USD_LEMONS', ambientAuthority, {
      errorMessage: 'psm-IST-USD_LEMONS instance not observed.',
    });

    // Provision the provisionPoolAddress. This is a workaround of provisionPoolAddress
    // not having a depositFacet published to namesByAddress. Shouldn't be a problem since
    // vat-bank keeps track of virtual purses per address basis. We need there to be
    // depositFacet for provisionPoolAddress since we'll fund it with USD_LEMONS
    await provision('provisionPoolAddress', PROVISIONING_POOL_ADDR);
    await checkUserProvisioned(PROVISIONING_POOL_ADDR, vstorageKit);

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
      { errorMessage: 'Provision pool not able to swap USDC_axl for IST.' },
    );
    t.pass();
  },
);

test.serial('manual provision', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  const { address } = await introduceAndProvision('manuallyProvisioned');
  await checkUserProvisioned(address, vstorageKit);
  t.log('manuallyProvisioned address:', address);
  t.pass();
});

test.serial('auto provision', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  const address = await addUser('automaticallyProvisioned');
  console.log('ADDR', 'automaticallyProvisioned', address);

  await bankSend(address, `50000000${ATOM_DENOM}`);
  // some bld is needed for auto-provisioning
  await bankSend(address, `10000000ubld`, GOV1ADDR);
  // some ist is needed for opening a new vault
  await bankSend(address, `10000000uist`, GOV1ADDR);
  await waitUntilAccountFunded(
    address,
    // TODO: drop agd.query and switch to vstorgeKit
    { log: console.log, setTimeout, query: agdAmbient.query },
    { denom: ATOM_DENOM, value: 50_000_000 },
    { errorMessage: `not able to fund ${address}` },
  );

  await openVault(address, '10.0', '20.0');
  await checkUserProvisioned(address, vstorageKit);
  t.pass();
});
