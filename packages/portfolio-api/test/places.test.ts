import '@endo/init/debug.js';

import test from 'ava';
import { AxelarChain } from '../src/constants.js';
import {
  isEvmChain,
  maybeChainOf,
  matchHoldingTokenId,
} from '../src/places.ts';
import type { AssetPlaceRef, PortfolioBalancePlaceRef } from '../src/types.ts';
import { runWithoutLockdown } from './without-lockdown.ts';

test('optional chain lookup preserves registered mappings and syntactic fallback', t => {
  for (const [place, expected] of [
    ['USDN', 'noble'],
    ['USDNVault', 'noble'],
    ['Aave_Base', 'Base'],
    ['@noble', 'noble'],
    ['<Cash>', 'agoric'],
    ['FutureVault_FutureChain', 'FutureChain'],
    ['UnknownVault', null],
  ] as const) {
    t.is<string | null, string | null>(
      maybeChainOf(place as AssetPlaceRef),
      expected,
    );
  }
});

test('EVM chain recognition rejects unresolved, non-string and inherited names', t => {
  for (const chain of Object.values(AxelarChain)) {
    t.true(isEvmChain(chain));
  }
  for (const specimen of [
    null,
    undefined,
    0,
    {},
    [],
    'agoric',
    'noble',
    'UnknownChain',
    'base',
    'Base ',
    'constructor',
    'toString',
    '__proto__',
  ]) {
    t.false(isEvmChain(specimen));
  }
});

test('shared chain helpers are frozen and usable without lockdown', async t => {
  await t.notThrowsAsync(
    runWithoutLockdown(`
    const { strict: assert } = await import('node:assert');
    const { maybeChainOf, isEvmChain, matchHoldingTokenId } = await import('@agoric/portfolio-api/src/places.js');
    assert.equal(maybeChainOf('USDN'), 'noble');
    assert.equal(maybeChainOf('UnknownVault'), null);
    assert.equal(isEvmChain(maybeChainOf('Aave_Base')), true);
    assert.equal(isEvmChain(null), false);
    assert.equal(Object.isFrozen(maybeChainOf), true);
    assert.equal(Object.isFrozen(isEvmChain), true);
    assert.equal(Object.isFrozen(matchHoldingTokenId), true);
    assert.equal(matchHoldingTokenId({ place: '@Base', tokenId: '0xABCD' }, '0xabcd'), true);
    assert.equal(matchHoldingTokenId({ place: '@noble', tokenId: 'ibc/ABC' }, 'ibc/abc'), false);
  `),
  );
});

test('holding token IDs match case-insensitively only on EVM chains', t => {
  for (const place of [
    '@Base',
    'Aave_Ethereum',
    'FutureVault_Arbitrum',
  ] as const) {
    const holding = {
      place: place as PortfolioBalancePlaceRef,
      tokenId: '0xAbCd',
    };
    t.true(matchHoldingTokenId(holding, '0xabcd'));
    t.true(matchHoldingTokenId({ ...holding, tokenId: '0xabcd' }, '0xAbCd'));
    t.false(matchHoldingTokenId(holding, '0xabce'));
  }
  for (const place of [
    '@noble',
    'USDN',
    '@agoric',
    'UnknownVault',
    '@Solana',
  ] as const) {
    const holding = {
      place: place as PortfolioBalancePlaceRef,
      tokenId: 'ibc/ABCDEF1234',
    };
    t.true(matchHoldingTokenId(holding, 'ibc/ABCDEF1234'));
    t.false(matchHoldingTokenId(holding, 'ibc/abcdef1234'));
    t.false(matchHoldingTokenId(holding, 'ibc/ABCDEF1235'));
  }
});

test('holding token ID matching rejects empty IDs and EVM IDs without a 0x payload', t => {
  for (const place of ['@Base', '@noble'] as const) {
    for (const [holdingTokenId, tokenId] of [
      ['', ''],
      ['', '0xabc'],
      ['0xabc', ''],
    ] as const) {
      t.false(matchHoldingTokenId({ place, tokenId: holdingTokenId }, tokenId));
    }
  }
  for (const invalid of ['a', '0', '0x', 'abc', '0Xabc']) {
    t.false(matchHoldingTokenId({ place: '@Base', tokenId: invalid }, invalid));
    t.false(matchHoldingTokenId({ place: '@Base', tokenId: invalid }, '0xabc'));
    t.false(matchHoldingTokenId({ place: '@Base', tokenId: '0xabc' }, invalid));
    t.true(matchHoldingTokenId({ place: '@noble', tokenId: invalid }, invalid));
  }
  t.true(matchHoldingTokenId({ place: '@Base', tokenId: '0xa' }, '0xA'));
});
