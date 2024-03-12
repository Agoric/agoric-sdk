import test from 'ava';

import { CHAINID, GOV1ADDR, GOV2ADDR, agd } from '@agoric/synthetic-chain';

test(`ante handler sends fee only to vbank/reserve`, async t => {
  const [feeCollector, vbankReserve] = await Promise.all(
    // Look up addresses for fee collector and reserve accounts.
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

  const getBalances = addresses =>
    Promise.all(
      addresses.map(async address => {
        const { balances } = await agd.query('bank', 'balances', address);
        return balances;
      }),
    );

  const [feeCollectorStartBalances, vbankReserveStartBalances] =
    await getBalances([feeCollector, vbankReserve]);

  // Send a transaction with a known fee.
  const feeAmount = 999n;
  const feeDenom = 'uist';
  const result = await agd.tx(
    `bank send ${GOV1ADDR} ${GOV2ADDR} 1234ubld --fees=${feeAmount}${feeDenom} \
    --from=${GOV1ADDR} --chain-id=${CHAINID} --keyring-backend=test --yes`,
  );
  t.like(result, { code: 0 });

  const [feeCollectorEndBalances, vbankReserveEndBalances] = await getBalances([
    feeCollector,
    vbankReserve,
  ]);
  t.deepEqual(feeCollectorEndBalances, feeCollectorStartBalances);

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
