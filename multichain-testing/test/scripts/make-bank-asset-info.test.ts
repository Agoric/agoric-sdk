import test from 'ava';
import { execFileSync } from 'node:child_process';

test('make-bank-asset-info', async t => {
  const stdout = execFileSync(
    'node_modules/.bin/tsx',
    ['scripts/make-bank-asset-info.ts'],
    { encoding: 'utf8' },
  );

  const assetInfo = JSON.parse(stdout);

  t.like(assetInfo, [
    {
      keyword: 'ATOM',
      decimalPlaces: 6,
    },
    {
      keyword: 'OSMO',
      decimalPlaces: 6,
    },
    {
      keyword: 'ION',
      decimalPlaces: 6,
    },
  ]);

  for (const { denom } of assetInfo) {
    t.regex(denom, /^ibc\//);
    t.is(denom.length, 68);
  }
});
