/* eslint-env node */

import test from 'ava';

import { Fail } from '@endo/errors';
import {
  retryUntilCondition,
  waitUntilAccountFunded,
} from '@agoric/client-utils';
import { VBankAccount } from '@agoric/internal/src/config.js'; 
import {
  addUser,
  agoric,
  CHAINID,
  evalBundles,
  GOV1ADDR,
  GOV2ADDR,
  makeAgd,
  provisionSmartWallet,
} from '@agoric/synthetic-chain';
import { execFileSync } from 'node:child_process';
import { agdWalletUtils } from './test-lib/index.js';
import { getBalances, replaceTemplateValuesInFile } from './test-lib/utils.js';
import { bankSend, tryISTBalances } from './test-lib/psm-lib.js';

/**
 * @param {string} file
 * @param {string[]} args
 * @param {Parameters<typeof execFileSync>[2]} [opts]
 */
const showAndExec = (file, args, opts) => {
  console.log('$', file, ...args);
  return execFileSync(file, args, opts);
};

// @ts-expect-error string is not assignable to Buffer
const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
  keyringBackend: 'test',
});

test.serial('manual wallet provisioning', async t => {
  const powers = { query: (...args) => agd.query(args), setTimeout };
  const denom = 'ubld'; // used for fees and initial funding
  const user = await addUser('manualWallet');
  const initialFund = [{ denom, value: 20e6 }];
  await bankSend(
    user,
    initialFund.map(amount => `${amount.value}${amount.denom}`).join(','),
  );
  await waitUntilAccountFunded(
    user,
    powers,
    initialFund[initialFund.length - 1],
    { errorMessage: 'manualWallet not funded' },
  );
  const addrs = {
    reservePool: VBankAccount.reserve.address,
    provisionPool: VBankAccount.provision.address,
    user,
  };
  const getBalancesRecord = async () => {
    const labels = Object.keys(addrs);
    const balances = await getBalances(Object.values(addrs), denom);
    balances.length === labels.length ||
      Fail`input/output mismatch between ${addrs} and ${balances}`;
    return Object.fromEntries(labels.map((label, i) => [label, balances[i]]));
  };
  const balancesBefore = await getBalancesRecord();
  t.log('balances before wallet provisioning', balancesBefore);
  const provisionFeeAmount = 10e6;
  await provisionSmartWallet(user, `${provisionFeeAmount}${denom}`);
  const balancesAfter = await getBalancesRecord();
  t.log('balances after wallet provisioning', balancesAfter);
  // 10 BLD fee goes to the reserve, but might be less than the minimum
  // transferable fee unit.
  t.true(balancesAfter.reservePool >= balancesBefore.reservePool);
  t.like(balancesAfter, {
    // 10 BLD initial funding comes from provisionPool
    provisionPool: balancesBefore.provisionPool - BigInt(10e6),
    // provisionSmartWallet now requires an amount arg
    // and we send 10 BLD, so the user balance should be
    // balance before + 10 BLD
    user: balancesBefore.user + BigInt(provisionFeeAmount),
  });
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

  // Using console.log here because t.log is inconsistent
  // when a test fails in CI. See https://github.com/Agoric/agoric-sdk/issues/10565#issuecomment-2561923537
  console.log('istBalanceBefore', istBalanceBefore);

  const offerId = 'bad-invitation-15'; // offer submitted on proposal upgrade-15 with an incorrect method name
  await agdWalletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'tryExitOffer',
    offerId,
  });

  const istBalanceAfter = await retryUntilCondition(
    async () => getBalances([GOV1ADDR], 'uist'),
    // We only check gov1's IST balance is changed.
    // Because the reclaimed amount (0,015 IST) is less than execution fee (0,2 IST)
    // we might end up with less IST than the one before reclaiming the stuck payment.
    istBalance => istBalance !== istBalanceBefore,
    'tryExitOffer did not end up changing the IST balance',
    { log: t.log, setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  console.log('istBalanceAfter', istBalanceAfter);

  await tryISTBalances(
    t,
    Number(istBalanceAfter),
    Number(istBalanceBefore + 15_000n),
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
    /** @param {{ denom: string }} balance */
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
