import test from 'ava';

import { agd, getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  network: { incarnation: 0 },
  ibc: { incarnation: 0 },
  localchain: { incarnation: 0 },
  orchestration: { incarnation: 0 },
  transfer: { incarnation: 0 },
  walletFactory: { incarnation: 3 },
  zoe: { incarnation: 1 },
};

test(`vat details`, async t => {
  await null;
  for (const [vatName, expected] of Object.entries(vats)) {
    const actual = await getVatDetails(vatName);
    t.like(actual, expected, `${vatName} details mismatch`);
  }
});

test('chain info', async t => {
  const cosmos = await agd
    .query(
      'vstorage',
      'data',
      '--output',
      'json',
      'published.agoricNames.chain.cosmos',
    )
    .then(res => JSON.parse(JSON.parse(JSON.parse(res.value).values[0]).body));
  console.log('chain.cosmos', cosmos);
  t.like(cosmos, { chainId: 'cosmoslocal' });

  const names = await agd.query(
    'vstorage',
    'children',
    '--output',
    'json',
    'published.agoricNames.chain',
  );
  t.deepEqual(names.children, [
    'agoric',
    'celestia',
    'cosmos',
    'osmosis',
    'stride',
  ]);
});
