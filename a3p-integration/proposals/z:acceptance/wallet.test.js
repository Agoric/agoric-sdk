import test from 'ava';
import {
  agoric,
  evalBundles,
  GOV1ADDR,
  GOV2ADDR,
  CHAINID,
  waitForBlock,
} from '@agoric/synthetic-chain';
import {
  agd,
  getBalances,
  replaceTemplateValuesInFile,
} from './test-lib/utils.js';
import { $ } from 'execa';

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
  const offerId = 'bad-invitation-15'; // offer submitted on proposal upgrade-15 with an incorrect method name
  const from = 'gov1';

  const before = await getBalances([GOV1ADDR], 'uist');
  t.log('uist balance before:', before);

  await $`node ./exitOffer.js --id ${offerId} --from ${from} `;
  await waitForBlock(2);

  const after = await getBalances([GOV1ADDR], 'uist');
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

  await waitForBlock();
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
