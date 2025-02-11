/* eslint-env node */
/**
 * @file The goal of this file is to make sure v36-reserve upgraded.
 *
 * The test scenario is as follows;
 * 1. Add asset USD_LEMONS
 * 2. Add collateral to the reserve
 * 3. Upgrade reserve
 * 4. Ensure that the collateral is still in the reserve
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

const ADD_PSM_DIR = 'generated/addUsdLemons';
const ADD_COLLATERAL = 'addCollateral';

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

test.serial('add Collateral to reserve', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  await evalBundles(ADD_PSM_DIR);
  await waitUntilContractDeployed('psm-IST-USD_LEMONS', ambientAuthority, {
    errorMessage: 'psm-IST-USD_LEMONS instance not observed.',
  });

  await evalBundles(ADD_COLLATERAL);

  const metrics = /** @type {ReserveAllocations} */ (
    await vstorageKit.readLatestHead('published.reserve.metrics')
  );

  t.truthy(Object.keys(metrics.allocations).includes('USD_LEMONS'));
  t.is(metrics.allocations.USD_LEMONS.value, 500000n);
});

test.serial('upgrade', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  const vatDetailsAfter = await getDetailsMatchingVats('reserve');
  const { incarnation } = vatDetailsAfter.find(vat => vat.vatID === 'v36'); // assetReserve is v36

  t.log(vatDetailsAfter);
  t.is(incarnation, 1, 'incorrect incarnation');

  const metrics = /** @type {ReserveAllocations} */ (
    await vstorageKit.readLatestHead('published.reserve.metrics')
  );

  t.truthy(Object.keys(metrics.allocations).includes('USD_LEMONS'));
  t.is(metrics.allocations.USD_LEMONS.value, 500000n);
});
