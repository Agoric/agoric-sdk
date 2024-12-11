/* eslint-env node */
/**
 * @file The goal of this file is to make sure v28-provisionPool and v14-bank can be successfully
 * upgraded. These vats are related because of the issues below;
 * - https://github.com/Agoric/agoric-sdk/issues/8722
 * - https://github.com/Agoric/agoric-sdk/issues/8724
 *
 * The test scenario is as follows;
 * 1. Upgrade provisionPool. This upgrade overrides provisionWalletBridgerManager with a durable one
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
 */

import '@endo/init';
import test from 'ava';
import {
  evalBundles,
  agd as agdAmbient,
  agoric,
  getDetailsMatchingVats,
} from '@agoric/synthetic-chain';
import {
  makeVstorageKit,
  waitUntilContractDeployed,
} from '@agoric/client-utils';

const ADD_PSM_DIR = 'addUsdLemons';
const UPGRADE_AR_DIR = 'upgradeAssetReserve';
const ADD_COLLAOTRAL_DIR = 'addCollateral';

const ambientAuthority = {
  query: agdAmbient.query,
  follow: agoric.follow,
  setTimeout,
  log: console.log,
};

/**
 * @typedef {import('@agoric/ertp').NatAmount} NatAmount
 * @typedef {{
 *   allocations: { Fee: NatAmount, USD_LEMONS: NatAmount },
 *  }} ReserveAllocations
 */

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial('add collatoral to reserve', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  // Introduce USD_LEMONS
  await evalBundles(ADD_PSM_DIR);
  await waitUntilContractDeployed('psm-IST-USD_LEMONS', ambientAuthority, {
    errorMessage: 'psm-IST-USD_LEMONS instance not observed.',
  });

  await evalBundles(ADD_COLLAOTRAL_DIR);
  // await evalBundles(UPGRADE_AR_DIR);

  const metrics = /** @type {ReserveAllocations} */ (
    await vstorageKit.readLatestHead('published.reserve.metrics')
  );

  t.truthy(Object.keys(metrics.allocations).includes('USD_LEMONS'));
  t.is(metrics.allocations.USD_LEMONS.value, 500000n);
});

test.serial('upgrade', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  await evalBundles(UPGRADE_AR_DIR);

  const vatDetailsAfter = await getDetailsMatchingVats('reserve');
  const { incarnation } = vatDetailsAfter.find(vat => vat.vatID === 'v36'); // assetReserve is v36

  t.log(vatDetailsAfter);
  t.is(incarnation, 1, 'incorrect incarnation');
  t.pass();

  const metrics = /** @type {ReserveAllocations} */ (
    await vstorageKit.readLatestHead('published.reserve.metrics')
  );

  t.truthy(Object.keys(metrics.allocations).includes('USD_LEMONS'));
  t.is(metrics.allocations.USD_LEMONS.value, 500000n);
});
