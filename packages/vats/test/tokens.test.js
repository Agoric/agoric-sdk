import { AssetKind } from '@agoric/ertp';
import { Stable, Stake } from '@agoric/internal/src/tokens.js';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import test from 'ava';

test('token symbols are keywords', t => {
  t.notThrows(() => assertKeywordName(Stable.symbol));
  t.notThrows(() => assertKeywordName(Stake.symbol));
});

test('token assetKind matches ERTP', t => {
  t.is(Stable.assetKind, AssetKind.NAT);
  t.is(Stake.assetKind, AssetKind.NAT);
});
