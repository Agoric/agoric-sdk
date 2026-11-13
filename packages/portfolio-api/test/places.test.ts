import '@endo/init/debug.js';

import test from 'ava';
import { AxelarChain } from '../src/constants.js';
import {
  getCanonicalHoldingKey,
  isEvmChain,
  makeTokenIdKey,
  maybeChainOf,
} from '../src/places.ts';
import type { AssetPlaceRef } from '../src/types.ts';
import { runWithoutLockdown } from './without-lockdown.ts';

test('token keys use place context while preserving the unspecified-place fallback', t => {
  const tokenId = '0xAbCd';
  for (const place of [undefined, null, '@Base', 'Aave_Base']) {
    t.is<string, string>(makeTokenIdKey(tokenId, place), '0xabcd');
  }
  for (const place of ['@noble', 'USDN', '<Cash>', 'UnknownVault', {}, 42]) {
    t.is<string, string>(makeTokenIdKey(tokenId, place), tokenId);
  }
  t.is<string, string>(
    makeTokenIdKey('factory/issuer/MyToken', '@noble'),
    'factory/issuer/MyToken',
  );
  t.is<string, string>(makeTokenIdKey('NotHex', '@Base'), 'NotHex');
});

test('holding keys delegate token canonicalization to their place', t => {
  for (const place of ['@Base', '@noble'] as const) {
    const holding = { place, kind: 'token' as const, tokenId: '0xAbCd' };
    const lower = { ...holding, tokenId: '0xabcd' };
    if (place === '@Base') {
      t.is(getCanonicalHoldingKey(holding), getCanonicalHoldingKey(lower));
    } else {
      t.not(getCanonicalHoldingKey(holding), getCanonicalHoldingKey(lower));
    }
    t.not(
      getCanonicalHoldingKey(holding),
      getCanonicalHoldingKey({ ...holding, kind: 'claimed-reward' }),
    );
    t.not(
      getCanonicalHoldingKey(holding),
      getCanonicalHoldingKey({ tokenId: holding.tokenId }),
    );
  }
});

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
    const { maybeChainOf, isEvmChain } = await import('@agoric/portfolio-api/src/places.js');
    assert.equal(maybeChainOf('USDN'), 'noble');
    assert.equal(maybeChainOf('UnknownVault'), null);
    assert.equal(isEvmChain(maybeChainOf('Aave_Base')), true);
    assert.equal(isEvmChain(null), false);
    assert.equal(Object.isFrozen(maybeChainOf), true);
    assert.equal(Object.isFrozen(isEvmChain), true);
  `),
  );
});
