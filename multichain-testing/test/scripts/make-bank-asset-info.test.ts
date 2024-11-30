import test from 'ava';
import { execFileSync } from 'node:child_process';

test('make-bank-asset-info', async t => {
  const stdout = execFileSync('./scripts/make-bank-asset-info.ts', {
    encoding: 'utf8',
  });

  const assetInfo = JSON.parse(stdout);

  t.like(assetInfo, [
    {
      issuerName: 'ATOM',
      decimalPlaces: 6,
    },
    {
      issuerName: 'OSMO',
      decimalPlaces: 6,
    },
    {
      issuerName: 'ION',
      decimalPlaces: 6,
    },
  ]);

  for (const { denom } of assetInfo) {
    t.regex(denom, /^ibc\//);
    t.is(denom.length, 68);
  }
});
