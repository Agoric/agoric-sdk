/* eslint-env node */

import test from 'ava';

import { retryUntilCondition } from '@agoric/client-utils';
import {
  agoric,
  CHAINID,
  evalBundles,
  GOV1ADDR,
  GOV2ADDR,
  makeAgd,
} from '@agoric/synthetic-chain';
import { execFileSync } from 'node:child_process';
import { agdWalletUtils } from './test-lib/index.js';
import { getBalances, replaceTemplateValuesInFile } from './test-lib/utils.js';

const showAndExec = (file, args, opts) => {
  console.log('$', file, ...args);
  return execFileSync(file, args, opts);
};

// @ts-expect-error string is not assignable to Buffer
const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
  keyringBackend: 'test',
});

test.serial(`send invitation via namesByAddress`, async t => {
  const SUBMISSION_DIR = 'invitation-test-submission';

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: GOV1ADDR,
  });

  await evalBundles(SUBMISSION_DIR);
  const update = await agoric.follow('-lF', `:published.wallet.${GOV1ADDR}`);

  t.is(
    update.updated,
    'balance',
    'The wallet update should indicate the "balance" was updated',
  );
  t.notDeepEqual(
    update.currentAmount.value,
    [],
    'The currentAmount value should not be empty',
  );
  t.regex(
    update.currentAmount.brand,
    /Invitation/,
    'The currentAmount brand should match "Invitation"',
  );
});

test.serial('exitOffer tool reclaims stuck payment', async t => {
  const istBalanceBefore = await getBalances([GOV1ADDR], 'uist');

  const offerId = 'bad-invitation-15'; // offer submitted on proposal upgrade-15 with an incorrect method name
  await agdWalletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'tryExitOffer',
    offerId,
  });

  const istBalanceAfter = await retryUntilCondition(
    async () => getBalances([GOV1ADDR], 'uist'),
    istBalance => istBalance > istBalanceBefore,
    'tryExitOffer failed to reclaim stuck payment ',
    { log: t.log, setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.true(
    istBalanceAfter > istBalanceBefore,
    'The IST balance should increase after reclaiming the stuck payment',
  );
});

test.serial(`ante handler sends fee only to vbank/reserve`, async t => {
  const [feeCollector, vbankReserve] = await Promise.all(
    ['fee_collector', 'vbank/reserve'].map(async name => {
      const {
        account: {
          '@type': moduleAcct,
          base_account: { address },
        },
      } = await agd.query(['auth', 'module-account', name]);

      t.is(
        moduleAcct,
        '/cosmos.auth.v1beta1.ModuleAccount',
        `${name} is a module account`,
      );
      return address;
    }),
  );

  const [feeCollectorStartBalances, vbankReserveStartBalances] =
    await getBalances([feeCollector, vbankReserve]);

  const feeAmount = 999n;
  const feeDenom = 'uist';
  const result = await agd.tx(
    [
      'bank',
      'send',
      GOV1ADDR,
      GOV2ADDR,
      '1234ubld',
      '--fees',
      `${feeAmount}${feeDenom}`,
    ],
    { chainId: CHAINID, from: GOV1ADDR, yes: true },
  );

  t.like(result, { code: 0 });

  const [feeCollectorEndBalances, vbankReserveEndBalances] = await getBalances([
    feeCollector,
    vbankReserve,
  ]);
  t.deepEqual(
    feeCollectorEndBalances,
    feeCollectorStartBalances,
    'feeCollector should NOT receive the fee',
  );

  // The reserve balances should have increased by exactly the fee (possibly
  // from zero, in which case start balances wouldn't include its denomination).
  const feeDenomIndex = vbankReserveStartBalances.findIndex(
    ({ denom }) => denom === feeDenom,
  );
  const preFeeAmount =
    feeDenomIndex < 0
      ? 0n
      : BigInt(vbankReserveStartBalances[feeDenomIndex].amount);
  const beforeCount =
    feeDenomIndex < 0 ? vbankReserveStartBalances.length : feeDenomIndex;

  const vbankReserveExpectedBalances = [
    ...vbankReserveStartBalances.slice(0, beforeCount),
    { amount: String(preFeeAmount + feeAmount), denom: feeDenom },
    ...vbankReserveStartBalances.slice(beforeCount + 1),
  ];

  t.deepEqual(
    vbankReserveEndBalances,
    vbankReserveExpectedBalances,
    'vbank/reserve should receive the fee',
  );
});
