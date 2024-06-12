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

const queryData = path =>
  agd
    .query('vstorage', 'data', '--output', 'json', path)
    .then(res => JSON.parse(JSON.parse(JSON.parse(res.value).values[0]).body));

test('chain info', async t => {
  const chain = await queryData('published.agoricNames.chain.cosmoshub');

  console.log('chain.cosmoshub', chain);
  t.like(chain, { chainId: 'cosmoshub-4' });
});

test('chain connection', async t => {
  const connection = await queryData(
    'published.agoricNames.chainConnection.cosmoshub-4_juno-1',
  );
  t.like(connection, { transferChannel: { portId: 'transfer' } });
});
