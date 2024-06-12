// @ts-check

import test from 'ava';

import {
  evalBundles,
  getIncarnation,
  waitForBlock,
} from '@agoric/synthetic-chain';

import { bankSend, getProvisionPoolMetrics } from './agd-tools.js';

const NULL_UPGRADE_BANK_DIR = 'upgrade-bank';
const UPGRADE_PP_DIR = 'upgrade-provisionPool';
const ADD_LEMONS_DIR = 'add-LEMONS';
const ADD_OLIVES_DIR = 'add-OLIVES';

const USDC_DENOM =
  'ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F';
const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

/**
 * @file
 * The problem to be addressed is that provisionPool won't correctly handle
 * (#8722) deposit of assets after it (provisionPool) is upgraded or (#8724)
 * new asset kinds after vat-bank is upgraded.
 *
 * To test this, we will
 *
 * 1. See that we can add USDC.
 *
 * 2. Null upgrade vat-bank, and see that we can add a new collateal.
 *
 * 2a. Not null upgrade provisionPool, since it would fail. If it had succeeded,
 * we would have been able to observe the effect of #8724, which would have
 * caused addition of new currencies to be ignored.
 *
 * 3. Do a full upgrade of provisionPool; then deposit USDC, and see IST
 * incremented in totalMintedConverted.
 *
 * 4. Null upgrade vat-bank again, and then see (in logs) that adding a new
 * asset type gives the ability to make deposits. We don't actually add it
 * because it would be too much work to add a faucet or other ability to mint
 * the new collateral.
 */

const contributeToPool = async (t, asset, expectedToGrow) => {
  const metricsBefore = await getProvisionPoolMetrics();
  console.log('PPT pre', metricsBefore);

  await bankSend(PROVISIONING_POOL_ADDR, asset);

  const metricsAfter = await getProvisionPoolMetrics();
  console.log('PPT post', metricsAfter);
  t.is(
    metricsAfter.totalMintedConverted.brand,
    metricsBefore.totalMintedConverted.brand,
    'brands match',
  );
  if (expectedToGrow) {
    // I couldn't import AmountMath. dunno why.
    t.true(
      metricsAfter.totalMintedConverted.value >
        metricsBefore.totalMintedConverted.value,
      'brands match',
    );
  } else {
    t.equal(
      metricsAfter.totalMintedConverted.value,
      metricsBefore.totalMintedConverted.value,
    );
  }
};

test('upgrading provisionPool and vat-bank', async t => {
  t.log('add assets before');
  await contributeToPool(t, `10000${USDC_DENOM}`, true);

  t.log(`upgrade Bank`);
  await evalBundles(NULL_UPGRADE_BANK_DIR);

  const firstIncarnation = await getIncarnation('bank');
  t.is(firstIncarnation, 1);

  await evalBundles(ADD_LEMONS_DIR);

  t.log('full upgrade ProvisionPool');
  await evalBundles(UPGRADE_PP_DIR);
  const ppIncarnation = await getIncarnation('db93f-provisionPool');
  t.is(ppIncarnation, 1);

  await contributeToPool(t, `30000${USDC_DENOM}`, true);

  t.log(`Add assets after bank upgrade`);
  await evalBundles(NULL_UPGRADE_BANK_DIR);
  await waitForBlock(2);

  const secondIncarnation = await getIncarnation('bank');
  t.is(secondIncarnation, 2);

  await evalBundles(ADD_OLIVES_DIR);
});
