import test from 'ava';

import type { Brand, DisplayInfo, Issuer } from '@agoric/ertp';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { Far } from '@endo/pass-style';
import { pickBalance } from '../src/engine.ts';

const mockDepositAsset = (name: string, assetKind: 'nat') => {
  // avoid VatData
  const brand = Far(`${name} brand`) as Brand<'nat'>;
  const issuer = Far(`${name} issuer`) as Issuer<'nat'>;
  const displayInfo: DisplayInfo = harden({ assetKind, decimalPlaces: 6 });
  const denom = 'ibc/123';
  const depositAsset: AssetInfo = harden({
    brand,
    denom,
    issuer,
    displayInfo,
    issuerName: name,
    proposedName: name,
  });
  return depositAsset;
};

test('ignore additional balances', t => {
  const usdc = mockDepositAsset('USDC', 'nat');
  const { denom, brand } = usdc;

  const balances = [
    { amount: '50', denom },
    { amount: '123', denom: 'ubld' },
  ];

  const actual = pickBalance(balances, usdc);
  t.deepEqual(actual, { brand, value: 50n });
});
