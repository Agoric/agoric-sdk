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

/**
 * Helper to create amounts with the given brand
 */
const makeAmount = (brand: Brand, value: bigint) => AmountMath.make(brand, value);

/**
 * Constant for empty amounts
 */
const EMPTY_AMOUNT = (brand: Brand) => AmountMath.makeEmpty(brand);

test('makeAssetSteps: simple Agoric allocation', t => {
  const { brand } = makeIssuerKit('USDC');
  const goal = {
    Agoric: makeAmount(brand, 100n),
  } as const;

  const result = makeAssetSteps(goal);

  t.deepEqual(result.give, {
    Deposit: makeAmount(brand, 100n),
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: makeAmount(brand, 100n) },
    { src: '@agoric', dest: '@noble', amount: makeAmount(brand, 100n) },
    { src: '@noble', dest: 'AgoricVault', amount: makeAmount(brand, 100n), detail: undefined },
  ]);
});

test('makeAssetSteps: Noble allocation (no additional steps)', t => {
  const { brand } = makeIssuerKit('USDC');
  const goal = {
    Noble: makeAmount(brand, 50n),
  } as const;

  const result = makeAssetSteps(goal);

  t.deepEqual(result.give, {
    Deposit: makeAmount(brand, 50n),
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: makeAmount(brand, 50n) },
    { src: '@agoric', dest: '@noble', amount: makeAmount(brand, 50n) },
  ]);
});

test('makeAssetSteps: EVM-based asset place', t => {
  const { brand: usdcBrand } = makeIssuerKit('USDC');
  const { brand: feeBrand } = makeIssuerKit('BLD');
  
  const goal = {
    CompoundArbitrum: makeAmount(usdcBrand, 200n),
  } as const;

  const result = makeAssetSteps(goal, {
    evm: 'Arbitrum',
    feeBrand,
  });

  const expectedAccountFee = makeAmount(feeBrand, 150n);
  const expectedCallFee = makeAmount(feeBrand, 100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    Deposit: makeAmount(usdcBrand, 200n),
    GmpFee: expectedGmpFee,
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: makeAmount(usdcBrand, 200n) },
    { src: '@agoric', dest: '@noble', amount: makeAmount(usdcBrand, 200n) },
    { src: '@noble', dest: '@Arbitrum', amount: makeAmount(usdcBrand, 200n), fee: expectedAccountFee },
    { src: '@Arbitrum', dest: 'CompoundArbitrum_Arbitrum', amount: makeAmount(usdcBrand, 200n), fee: expectedCallFee },
  ]);
});

test('makeAssetSteps: mixed allocation with custom details', t => {
  const { brand: usdcBrand } = makeIssuerKit('USDC');
  const { brand: feeBrand } = makeIssuerKit('BLD');
  
  const goal = {
    Agoric: makeAmount(usdcBrand, 60n),
    AavePolygon: makeAmount(usdcBrand, 40n),
  } as const;

  const result = makeAssetSteps(goal, {
    evm: 'Polygon',
    feeBrand,
    detail: {
      Agoric: 59n, // 99% of 60
    },
  });

  const expectedAccountFee = makeAmount(feeBrand, 150n);
  const expectedCallFee = makeAmount(feeBrand, 100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    Deposit: makeAmount(usdcBrand, 100n),
    GmpFee: expectedGmpFee,
  });

  t.deepEqual(result.steps, [
    { src: '<Deposit>', dest: '@agoric', amount: makeAmount(usdcBrand, 100n) },
    { src: '@agoric', dest: '@noble', amount: makeAmount(usdcBrand, 100n) },
    { src: '@noble', dest: 'AgoricVault', amount: makeAmount(usdcBrand, 60n), detail: { assetOut: 59n } },
    { src: '@noble', dest: '@Polygon', amount: makeAmount(usdcBrand, 40n), fee: expectedAccountFee },
    { src: '@Polygon', dest: 'AavePolygon_Polygon', amount: makeAmount(usdcBrand, 40n), fee: expectedCallFee },
  ]);
});

test('makeAssetSteps: custom fees per asset place', t => {
  const { brand: usdcBrand } = makeIssuerKit('USDC');
  const { brand: feeBrand } = makeIssuerKit('BLD');
  
  const goal = {
    CompoundArbitrum: makeAmount(usdcBrand, 100n),
    AavePolygon: makeAmount(usdcBrand, 100n),
  } as const;

  const customFees = {
    CompoundArbitrum: {
      Account: makeAmount(feeBrand, 200n),
      Call: makeAmount(feeBrand, 150n),
    },
    AavePolygon: {
      Account: makeAmount(feeBrand, 100n),
      Call: makeAmount(feeBrand, 75n),
    },
  };

  const result = makeAssetSteps(goal, {
    feeBrand,
    fees: customFees,
  });

  const expectedGmpFee = makeAmount(feeBrand, 525n); // 200+150+100+75

  t.deepEqual(result.give, {
    Deposit: makeAmount(usdcBrand, 200n),
    GmpFee: expectedGmpFee,
  });

  t.is(result.steps.length, 6);
  // Check that custom fees are used
  t.deepEqual(result.steps[2].fee, makeAmount(feeBrand, 200n));
  t.deepEqual(result.steps[3].fee, makeAmount(feeBrand, 150n));
  t.deepEqual(result.steps[4].fee, makeAmount(feeBrand, 100n));
  t.deepEqual(result.steps[5].fee, makeAmount(feeBrand, 75n));
});

test('makeAssetSteps: empty goal throws', t => {
  const goal = {};
  
  t.throws(() => makeAssetSteps(goal), {
    message: /empty goal/,
  });
});

test('makeWithdrawalSteps: simple Agoric withdrawal', t => {
  const { brand } = makeIssuerKit('USDC');
  const sources = {
    Agoric: makeAmount(brand, 100n),
  } as const;

  const result = makeWithdrawalSteps(sources);

  t.deepEqual(result.give, {});
  t.deepEqual(result.want, {
    Cash: makeAmount(brand, 100n),
  });

  t.deepEqual(result.steps, [
    { src: 'AgoricVault', dest: '@noble', amount: makeAmount(brand, 100n), detail: undefined },
    { src: '@noble', dest: '@agoric', amount: makeAmount(brand, 100n) },
    { src: '@agoric', dest: '<Cash>', amount: makeAmount(brand, 100n) },
  ]);
});

test('makeWithdrawalSteps: Noble withdrawal (no additional steps)', t => {
  const { brand } = makeIssuerKit('USDC');
  const sources = {
    Noble: makeAmount(brand, 50n),
  } as const;

  const result = makeWithdrawalSteps(sources);

  t.deepEqual(result.give, {});
  t.deepEqual(result.want, {
    Cash: makeAmount(brand, 50n),
  });

  t.deepEqual(result.steps, [
    { src: '@noble', dest: '@agoric', amount: makeAmount(brand, 50n) },
    { src: '@agoric', dest: '<Cash>', amount: makeAmount(brand, 50n) },
  ]);
});

test('makeWithdrawalSteps: EVM-based asset place withdrawal', t => {
  const { brand: usdcBrand } = makeIssuerKit('USDC');
  const { brand: feeBrand } = makeIssuerKit('BLD');
  
  const sources = {
    CompoundArbitrum: makeAmount(usdcBrand, 200n),
  } as const;

  const result = makeWithdrawalSteps(sources, {
    evm: 'Arbitrum',
    feeBrand,
  });

  const expectedAccountFee = makeAmount(feeBrand, 150n);
  const expectedCallFee = makeAmount(feeBrand, 100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    GmpFee: expectedGmpFee,
  });
  t.deepEqual(result.want, {
    Cash: makeAmount(usdcBrand, 200n),
  });

  t.deepEqual(result.steps, [
    { src: 'CompoundArbitrum_Arbitrum', dest: '@Arbitrum', amount: makeAmount(usdcBrand, 200n), fee: expectedCallFee },
    { src: '@Arbitrum', dest: '@noble', amount: makeAmount(usdcBrand, 200n), fee: expectedAccountFee },
    { src: '@noble', dest: '@agoric', amount: makeAmount(usdcBrand, 200n) },
    { src: '@agoric', dest: '<Cash>', amount: makeAmount(usdcBrand, 200n) },
  ]);
});

test('makeWithdrawalSteps: mixed withdrawal with custom details', t => {
  const { brand: usdcBrand } = makeIssuerKit('USDC');
  const { brand: feeBrand } = makeIssuerKit('BLD');
  
  const sources = {
    Agoric: makeAmount(usdcBrand, 60n),
    AavePolygon: makeAmount(usdcBrand, 40n),
  } as const;

  const result = makeWithdrawalSteps(sources, {
    evm: 'Polygon',
    feeBrand,
    detail: {
      Agoric: 59n, // 99% of 60
    },
  });

  const expectedAccountFee = makeAmount(feeBrand, 150n);
  const expectedCallFee = makeAmount(feeBrand, 100n);
  const expectedGmpFee = AmountMath.add(expectedAccountFee, expectedCallFee);

  t.deepEqual(result.give, {
    GmpFee: expectedGmpFee,
  });
  t.deepEqual(result.want, {
    Cash: makeAmount(usdcBrand, 100n),
  });

  t.deepEqual(result.steps, [
    { src: 'AgoricVault', dest: '@noble', amount: makeAmount(usdcBrand, 60n), detail: { assetOut: 59n } },
    { src: 'AavePolygon_Polygon', dest: '@Polygon', amount: makeAmount(usdcBrand, 40n), fee: expectedCallFee },
    { src: '@Polygon', dest: '@noble', amount: makeAmount(usdcBrand, 40n), fee: expectedAccountFee },
    { src: '@noble', dest: '@agoric', amount: makeAmount(usdcBrand, 100n) },
    { src: '@agoric', dest: '<Cash>', amount: makeAmount(usdcBrand, 100n) },
  ]);
});

test('makeWithdrawalSteps: empty sources throws', t => {
  const sources = {};
  
  t.throws(() => makeWithdrawalSteps(sources), {
    message: /empty sources/,
  });
});

test('AssetPlace type compatibility', t => {
  const { brand } = makeIssuerKit('USDC');
  
  // Test that various AssetPlace values work
  const validAssetPlaces: Record<AssetPlace, any> = {
    'Agoric': makeAmount(brand, 100n),
    'Noble': makeAmount(brand, 50n),
    'Arbitrum': makeAmount(brand, 75n),
    'USDNVault': makeAmount(brand, 25n),
    'AgoricVault': makeAmount(brand, 30n),
    'CustomPlace': makeAmount(brand, 10n),
  };

  // Should not throw
  t.notThrows(() => makeAssetSteps(validAssetPlaces));
  t.notThrows(() => makeWithdrawalSteps(validAssetPlaces));
});
