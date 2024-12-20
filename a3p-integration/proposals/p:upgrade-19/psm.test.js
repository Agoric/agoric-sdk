/* eslint-env node */
/**
 * @file The goal of this file is to make sure v36-reserve upgraded.
 *
 * The test scenario is as follows;
 * 1. Simulate trade of IST and USDC
 * 2. Upgrade all PSMs
 * 3. Verify metrics are the same after the upgrade
 * 4. Verity trading is still possible after the upgrade
 */

import '@endo/init';
import test from 'ava';
import { evalBundles } from '@agoric/synthetic-chain';
import { makeVstorageKit } from '@agoric/client-utils';

const UPGRADE_PSM_DIR = 'upgradePSM';
const SWAP_ANCHOR = 'swapAnchorForMintedSeat';

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial('similate trade of IST and USDC', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  await evalBundles(SWAP_ANCHOR);

  const metrics = await vstorageKit.readLatestHead(
    'published.psm.IST.USDC.metrics',
  );

  t.is(metrics.anchorPoolBalance.value, 500000n);
  t.is(metrics.feePoolBalance.value, 0n);
  t.is(metrics.mintedPoolBalance.value, 500000n);
  t.is(metrics.totalAnchorProvided.value, 0n);
  t.is(metrics.totalMintedProvided.value, 500000n);
});

test.serial('upgrade PSMs', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  await evalBundles(UPGRADE_PSM_DIR);

  const metrics = await vstorageKit.readLatestHead(
    'published.psm.IST.USDC.metrics',
  );

  t.is(metrics.anchorPoolBalance.value, 500000n);
  t.is(metrics.feePoolBalance.value, 0n);
  t.is(metrics.mintedPoolBalance.value, 500000n);
  t.is(metrics.totalAnchorProvided.value, 0n);
  t.is(metrics.totalMintedProvided.value, 500000n);
});

test.serial('verify trading after upgrade', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  await evalBundles(SWAP_ANCHOR);

  const metrics = await vstorageKit.readLatestHead(
    'published.psm.IST.USDC.metrics',
  );

  t.is(metrics.anchorPoolBalance.value, 1000000n);
  t.is(metrics.feePoolBalance.value, 0n);
  t.is(metrics.mintedPoolBalance.value, 1000000n);
  t.is(metrics.totalAnchorProvided.value, 0n);
  t.is(metrics.totalMintedProvided.value, 1000000n);
});
