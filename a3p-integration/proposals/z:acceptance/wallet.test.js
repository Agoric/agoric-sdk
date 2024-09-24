import test from 'ava';
import {
  agd,
  agoric,
  evalBundles,
  GOV1ADDR,
  GOV2ADDR,
  CHAINID,
  waitForBlock,
} from '@agoric/synthetic-chain';
import { readFile, writeFile } from 'node:fs/promises';
import { $ } from 'execa';

/**
 * @param {string} fileName base file name without .tjs extension
 * @param {Record<string, string>} replacements
 */
const replaceTemplateValuesInFile = async (fileName, replacements) => {
  let script = await readFile(`${fileName}.tjs`, 'utf-8');
  for (const [template, value] of Object.entries(replacements)) {
    script = script.replaceAll(`{{${template}}}`, value);
  }
  await writeFile(`${fileName}.js`, script);
};

/**
 * @param {string[]} addresses
 * @param {string} [targetDenom]
 */
const getBalance = async (addresses, targetDenom = undefined) => {
  const balancesList = await Promise.all(
    addresses.map(async address => {
      const { balances } = await agd.query('bank', 'balances', address);

      if (targetDenom) {
        const balance = balances.find(({ denom }) => denom === targetDenom);
        return Number(balance.amount);
      }

      return balances;
    }),
  );

  return addresses.length === 1 ? balancesList[0] : balancesList;
};

test.only(`send invitation via namesByAddress`, async t => {
  const SUBMISSION_DIR = 'invitation-test-submission';

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: GOV1ADDR,
  });

  await evalBundles(SUBMISSION_DIR);
  await waitForBlock(2);

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
  const offerId = 'bad-invitation-15'; // offer submitted on proposal upgrade-15 with an incorrect method name
  const from = 'gov1';

  const before = await getBalance([GOV1ADDR], 'uist');
  t.log('uist balance before:', before);

  await $`node ./exitOffer.js --id ${offerId} --from ${from} `;
  await waitForBlock(2);

  const after = await getBalance([GOV1ADDR], 'uist');
  t.log('uist balance after:', after);

  t.true(after > before),
    'The IST balance should increase after reclaiming the stuck payment';
});

test.serial(`ante handler sends fee only to vbank/reserve`, async t => {
  const [feeCollector, vbankReserve] = await Promise.all(
    ['fee_collector', 'vbank/reserve'].map(async name => {
      const {
        account: {
          '@type': moduleAcct,
          base_account: { address },
        },
      } = await agd.query('auth', 'module-account', name);

      t.is(
        moduleAcct,
        '/cosmos.auth.v1beta1.ModuleAccount',
        `${name} is a module account`,
      );
      return address;
    }),
  );

  const [feeCollectorStartBalances, vbankReserveStartBalances] =
    await getBalance([feeCollector, vbankReserve]);

  // Send a transaction with a known fee.
  const feeAmount = 999n;
  const feeDenom = 'uist';
  const result = await agd.tx(
    `bank send ${GOV1ADDR} ${GOV2ADDR} 1234ubld --fees=${feeAmount}${feeDenom} \
    --from=${GOV1ADDR} --chain-id=${CHAINID} --keyring-backend=test --yes`,
  );
  await waitForBlock();
  t.like(result, { code: 0 });

  const [feeCollectorEndBalances, vbankReserveEndBalances] = await getBalance([
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
