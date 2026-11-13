import '@endo/init/debug.js';

import test from 'ava';
import { AxelarChain } from '../src/constants.js';
import { isEvmChain, maybeChainOf } from '../src/places.ts';
import type { AssetPlaceRef } from '../src/types.ts';
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
