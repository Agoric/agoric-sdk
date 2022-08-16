// @ts-check
/* eslint-disable import/order */

import { test as unknownTest } from './prepare-test-env-ava.js';

import { E } from '@endo/far';

import { makeLeader } from '../src/main.js';

import { startFakeServer } from './fake-rpc-server.js';

/** @type {import('ava').TestFn<{cleanups: Function[], startServer: typeof startFakeServer}>} */
const test = unknownTest;

test.before(t => {
  t.context.cleanups = [];
  t.context.startServer = startFakeServer;
});

test.after(t => {
  t.context.cleanups.map(cleanup => cleanup());
});

/**
 * Key material determines a Cosmos address (e.g. agoric1blahblahblah). Here the address is of a wallet from the smartWallet factory.
 */
test('oracle uses transaction client', async t => {
  const PORT = await t.context.startServer(t, []);
  const leader = makeLeader(`http://localhost:${PORT}/network-config`, {
    retryCallback: null,
    // jitter: null,
  });
  /** @type {import('../src/types.js').WalletActionClient} */
  const client = await E(leader).makeClient({
    // key material the client can use to access the previously signed offer result
    // e.g. offerResult:3 was signed with this key…
    seed: new Uint8Array([
      0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0,
      1, 2, 3, 3, 2, 1, 0,
    ]),
  });
  client.sendAction({
    type: 'applyMethod',
    body: JSON.stringify([
      { '@qclass': 'slot', index: 0 },
      'pushResult',
      [
        {
          numerator: {
            value: { '@qclass': 'bigint', digits: '12345' },
            brand: { '@qclass': 'slot', index: 1 },
          },
          denominator: {
            value: { '@qclass': 'bigint', digits: '67890' },
            brand: { '@qclass': 'slot', index: 2 },
          },
        },
      ],
    ]),
    slots: ['offerResult:3', 'board0133', 'board244'],
  });
});
