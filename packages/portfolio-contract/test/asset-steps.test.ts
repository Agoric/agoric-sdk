import test from 'ava';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { makeAssetSteps, makeWithdrawalSteps, type AssetPlace } from '../tools/asset-steps.js';
import type { Brand } from '@agoric/ertp/src/types.js';

/**
 * Fake for testing
 */
const makeIssuerKit = (name: string) => {
  return { brand: Far(name) as Brand };
};

// Module-level brand constants
const USDC_BRAND = makeIssuerKit('USDC').brand;
const FEE_BRAND = makeIssuerKit('BLD').brand;

/**
 * Helper to create USDC amounts
 */
const usdc = (value: bigint) => AmountMath.make(USDC_BRAND, value);

/**
 * Helper to create fee amounts
 */
const fee = (value: bigint) => AmountMath.make(FEE_BRAND, value);

/**
 * Empty amount constants
 */
const EMPTY_USDC = AmountMath.makeEmpty(USDC_BRAND);
const EMPTY_FEE = AmountMath.makeEmpty(FEE_BRAND);

test('makeAssetSteps: simple Agoric allocation', t => {
  const goal = {
    Agoric: usdc(100n),
  } as const;

  const result = makeAssetSteps(goal);

  t.deepEqual(result.give, {
    Deposit: usdc(100n),
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: usdc(100n) },
    { src: '@agoric', dest: '@noble', amount: usdc(100n) },
    { src: '@noble', dest: 'AgoricVault', amount: usdc(100n), detail: undefined },
  ]);
});

test('makeAssetSteps: Noble allocation (no additional steps)', t => {
  const goal = {
    Noble: usdc(50n),
  } as const;

  const result = makeAssetSteps(goal);

  t.deepEqual(result.give, {
    Deposit: usdc(50n),
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: usdc(50n) },
    { src: '@agoric', dest: '@noble', amount: usdc(50n) },
  ]);
});

test('makeAssetSteps: EVM-based asset place', t => {
  const goal = {
    CompoundArbitrum: usdc(200n),
  } as const;

  const result = makeAssetSteps(goal, {
    evm: 'Arbitrum',
    feeBrand: FEE_BRAND,
  });

  const expectedAccountFee = fee(150n);
  const expectedCallFee = fee(100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    Deposit: usdc(200n),
    GmpFee: expectedGmpFee,
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: usdc(200n) },
    { src: '@agoric', dest: '@noble', amount: usdc(200n) },
    { src: '@noble', dest: '@Arbitrum', amount: usdc(200n), fee: expectedAccountFee },
    { src: '@Arbitrum', dest: 'CompoundArbitrum_Arbitrum', amount: usdc(200n), fee: expectedCallFee },
  ]);
});

test('makeAssetSteps: mixed allocation with custom details', t => {
  const goal = {
    Agoric: usdc(60n),
    AavePolygon: usdc(40n),
  } as const;

  const result = makeAssetSteps(goal, {
    evm: 'Polygon',
    feeBrand: FEE_BRAND,
    detail: {
      Agoric: 59n, // 99% of 60
    },
  });

  const expectedAccountFee = fee(150n);
  const expectedCallFee = fee(100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    Deposit: usdc(100n),
    GmpFee: expectedGmpFee,
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: usdc(100n) },
    { src: '@agoric', dest: '@noble', amount: usdc(100n) },
    { src: '@noble', dest: 'AgoricVault', amount: usdc(60n), detail: { assetOut: 59n } },
    { src: '@noble', dest: '@Polygon', amount: usdc(40n), fee: expectedAccountFee },
    { src: '@Polygon', dest: 'AavePolygon_Polygon', amount: usdc(40n), fee: expectedCallFee },
  ]);
});

test('makeAssetSteps: custom fees per asset place', t => {
  const goal = {
    CompoundArbitrum: usdc(100n),
    AavePolygon: usdc(100n),
  } as const;

  const customFees = {
    CompoundArbitrum: {
      Account: fee(200n),
      Call: fee(150n),
    },
    AavePolygon: {
      Account: fee(100n),
      Call: fee(75n),
    },
  };

  const result = makeAssetSteps(goal, {
    feeBrand: FEE_BRAND,
    fees: customFees,
  });

  const expectedGmpFee = fee(525n); // 200+150+100+75

  t.deepEqual(result.give, {
    Deposit: usdc(200n),
    GmpFee: expectedGmpFee,
  });

  t.is(result.steps.length, 6);
  // Check that custom fees are used
  t.deepEqual(result.steps[2].fee, fee(200n));
  t.deepEqual(result.steps[3].fee, fee(150n));
  t.deepEqual(result.steps[4].fee, fee(100n));
  t.deepEqual(result.steps[5].fee, fee(75n));
});

test('makeAssetSteps: empty goal throws', t => {
  const goal = {};
  
  t.throws(() => makeAssetSteps(goal), {
    message: /empty goal/,
  });
});

test('makeWithdrawalSteps: simple Agoric withdrawal', t => {
  const sources = {
    Agoric: usdc(100n),
  } as const;

  const result = makeWithdrawalSteps(sources);

  t.deepEqual(result.give, {});
  t.deepEqual(result.want, {
    Cash: usdc(100n),
  });

  t.deepEqual(result.steps, [
    { src: 'AgoricVault', dest: '@noble', amount: usdc(100n), detail: undefined },
    { src: '@noble', dest: '@agoric', amount: usdc(100n) },
    { src: '@agoric', dest: '<Cash>', amount: usdc(100n) },
  ]);
});

test('makeWithdrawalSteps: Noble withdrawal (no additional steps)', t => {
  const sources = {
    Noble: usdc(50n),
  } as const;

  const result = makeWithdrawalSteps(sources);

  t.deepEqual(result.give, {});
  t.deepEqual(result.want, {
    Cash: usdc(50n),
  });

  t.deepEqual(result.steps, [
    { src: '@noble', dest: '@agoric', amount: usdc(50n) },
    { src: '@agoric', dest: '<Cash>', amount: usdc(50n) },
  ]);
});

test('makeWithdrawalSteps: EVM-based asset place withdrawal', t => {
  const sources = {
    CompoundArbitrum: usdc(200n),
  } as const;

  const result = makeWithdrawalSteps(sources, {
    evm: 'Arbitrum',
    feeBrand: FEE_BRAND,
  });

  const expectedAccountFee = fee(150n);
  const expectedCallFee = fee(100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    GmpFee: expectedGmpFee,
  });
  t.deepEqual(result.want, {
    Cash: usdc(200n),
  });

  t.deepEqual(result.steps, [
    { src: 'CompoundArbitrum_Arbitrum', dest: '@Arbitrum', amount: usdc(200n), fee: expectedCallFee },
    { src: '@Arbitrum', dest: '@noble', amount: usdc(200n), fee: expectedAccountFee },
    { src: '@noble', dest: '@agoric', amount: usdc(200n) },
    { src: '@agoric', dest: '<Cash>', amount: usdc(200n) },
  ]);
});

test('makeWithdrawalSteps: mixed withdrawal with custom details', t => {
  const sources = {
    Agoric: usdc(60n),
    AavePolygon: usdc(40n),
  } as const;

  const result = makeWithdrawalSteps(sources, {
    evm: 'Polygon',
    feeBrand: FEE_BRAND,
    detail: {
      Agoric: 59n, // 99% of 60
    },
  });

  const expectedAccountFee = fee(150n);
  const expectedCallFee = fee(100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    GmpFee: expectedGmpFee,
  });
  t.deepEqual(result.want, {
    Cash: usdc(100n),
  });

  t.deepEqual(result.steps, [
    { src: 'AgoricVault', dest: '@noble', amount: usdc(60n), detail: { assetOut: 59n } },
    { src: 'AavePolygon_Polygon', dest: '@Polygon', amount: usdc(40n), fee: expectedCallFee },
    { src: '@Polygon', dest: '@noble', amount: usdc(40n), fee: expectedAccountFee },
    { src: '@noble', dest: '@agoric', amount: usdc(100n) },
    { src: '@agoric', dest: '<Cash>', amount: usdc(100n) },
  ]);
});

test('makeWithdrawalSteps: empty sources throws', t => {
  const sources = {};
  
  t.throws(() => makeWithdrawalSteps(sources), {
    message: /empty sources/,
  });
});

test('AssetPlace type compatibility', t => {
  // Test that various AssetPlace values work
  const validAssetPlaces: Record<AssetPlace, any> = {
    'Agoric': usdc(100n),
    'Noble': usdc(50n),
    'Arbitrum': usdc(75n),
    'USDNVault': usdc(25n),
    'AgoricVault': usdc(30n),
    'CustomPlace': usdc(10n),
  };

  // Should not throw
  t.notThrows(() => makeAssetSteps(validAssetPlaces));
  t.notThrows(() => makeWithdrawalSteps(validAssetPlaces));
});
