/* eslint-env node */
import test from 'ava';

import {
  generateOracleMap,
  getPriceQuote,
  getVaultPrices,
} from '@agoric/synthetic-chain';
import {
  getPriceFeedRoundId,
  verifyPushedPrice,
} from './test-lib/price-feed.js';

test.serial('confirm that Oracle prices are being received', async t => {
  /*
   * The Oracle for ATOM and stATOM brands are being registered in the offer made at file:
   * a3p-integration/proposals/n:upgrade-next/verifyPushedPrice.js
   * which is being executed during the use phase of upgrade-next proposal
   */
  const ATOMManagerIndex = 0;
  const BRANDS = ['ATOM'];
  const BASE_ID = 'n-upgrade';
  const oraclesByBrand = generateOracleMap(BASE_ID, BRANDS);

  const latestRoundId = await getPriceFeedRoundId(BRANDS[0]);
  const roundId = latestRoundId + 1;

  await verifyPushedPrice(oraclesByBrand, BRANDS[0], 10, roundId);

  const atomQuote = await getPriceQuote(BRANDS[0]);
  t.is(
    atomQuote,
    '+10000000',
    'ATOM price quote does not match the expected value',
  );

  const vaultQuote = await getVaultPrices(ATOMManagerIndex);

  t.true(
    vaultQuote.value[0].amountIn.brand.includes(' ATOM '),
    'ATOM price quote not found',
  );
  t.is(
    vaultQuote.value[0].amountOut.value,
    atomQuote,
    'Vault price quote does not match the expected ATOM price quote',
  );
});
