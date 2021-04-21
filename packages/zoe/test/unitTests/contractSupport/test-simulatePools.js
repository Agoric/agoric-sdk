// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import '../../../exported';

import { setup } from '../setupBasicMints';
import {
  makeSimpleFeePool,
  makePoolChargeFeeInX,
  makePoolExractPartialFee,
  makeStrategicFeePool,
} from './pools';

function formatTrade(trade) {
  return `${trade.deltaX}, ${trade.deltaY}, ${trade.k}`;
}

// Trade values chosen from successive digits of Pi
function applyTrades(t, pool, moola, bucks, firstResult) {
  pool.tradeIn(moola(107));
  t.deepEqual(pool.getTrades(), [firstResult]);
  pool.tradeOut(bucks(325));
  pool.tradeOut(bucks(147));
  pool.tradeIn(moola(371));
  pool.tradeOut(moola(237));

  pool.tradeOut(moola(2384));
  pool.tradeOut(bucks(6264));
  pool.tradeIn(moola(3383));
  pool.tradeOut(moola(2795));

  pool.tradeOut(moola(28848));
  pool.tradeIn(bucks(19716));
  pool.tradeIn(moola(93993));
  pool.tradeIn(moola(75105));

  pool.tradeIn(bucks(8209749));
  pool.tradeOut(bucks(4459230));
  pool.tradeIn(moola(7816406));
  pool.tradeOut(moola(2862089));
}

// With no fee, K grows consistently because the pool benefits from roundoff
test('no fee', t => {
  const { moola, bucks } = setup();
  console.log(`NO FEE`);

  const pool = makeSimpleFeePool(moola(30000n), bucks(80000n));
  applyTrades(t, pool, moola, bucks, {
    deltaX: 107n,
    deltaY: -284n,
    k: 2400009612n,
    x: 30107n,
    y: 79716n,
    specifyX: true,
  });

  for (const trade of pool.getTrades()) {
    console.log(formatTrade(trade));
  }
});

// With a small fee, K grows at >30BP per trade.
test('simple fee', t => {
  const { moola, bucks } = setup();
  console.log(`SIMPLE FEE`);

  const pool = makeSimpleFeePool(moola(30000n), bucks(80000n), 30n);
  applyTrades(t, pool, moola, bucks, {
    deltaX: 107n,
    deltaY: -283n,
    k: 2400039719n,
    x: 30107n,
    y: 79717n,
    specifyX: true,
  });

  for (const trade of pool.getTrades()) {
    console.log(formatTrade(trade));
  }
});

function formatComplexTrade(trade) {
  return `${trade.deltaX}, ${trade.deltaY}, ${trade.pay}, ${trade.get}, ${
    trade.k
  }, ${trade.protocol}, ${trade.specifyX ? 'X' : 'Y'}`;
}

// Charge a portion of the fee in moola, paid on every trade
test('charge fee in moola', t => {
  const { moola, bucks } = setup();
  console.log(`MOOLA FEE`);

  const pool = makePoolChargeFeeInX(moola(30000n), bucks(80000n), 30n, 6n);
  applyTrades(t, pool, moola, bucks, {
    deltaX: 107n,
    deltaY: -283n,
    k: 2400039719n,
    x: 30107n,
    y: 79717n,
    pay: -107n,
    get: 283n,
    protocol: 0n,
    specifyX: true,
  });

  for (const trade of pool.getTrades()) {
    console.log(formatComplexTrade(trade));
  }
});

// Charge a portion of the fee in moola, paid on every trade
test.skip('convert fee to moola', t => {
  const { moola, bucks } = setup();
  console.log(`EXTRACT FEE`);

  const pool = makePoolExractPartialFee(moola(30000n), bucks(80000n), 30n, 6n);
  applyTrades(t, pool, moola, bucks, {
    deltaX: 107n,
    deltaY: -283n,
    k: 2400039719n,
    x: 30107n,
    y: 79717n,
    pay: -107n,
    get: 283n,
    protocol: 0n,
    specifyX: true,
  });

  for (const trade of pool.getTrades()) {
    console.log(formatComplexTrade(trade));
  }
});

test('new strategy', t => {
  const { moola, bucks } = setup();
  console.log(`new charging Strategy`);

  const pool = makeStrategicFeePool(moola(30000n), bucks(80000n), 30n, 6n);
  applyTrades(t, pool, moola, bucks, {
    deltaX: 107n,
    deltaY: -283n,
    k: 2400039719n,
    x: 30107n,
    y: 79717n,
    pay: -107n,
    get: 283n,
    protocol: 0n,
    specifyX: true,
  });

  for (const trade of pool.getTrades()) {
    console.log(formatComplexTrade(trade));
  }
});
