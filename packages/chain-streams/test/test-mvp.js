// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from './prepare-test-env-ava.js';

import {
  iterateLatest,
  makeChainStream,
  makeLeader,
  makeStoreKey,
} from '../src/main.js';

import { delay } from '../src/defaults.js';
import { startFakeServer } from './fake-rpc-server.js';

test('happy path', async t => {
  const expected = ['latest', 'later', 'done'];
  t.plan(expected.length);
  const PORT = await t.context.startServer(t, [...expected]);
  /** @type {import('../src/types.js').ChainLeaderOptions} */
  const lo = {
    retryCallback: null, // fail fast, no retries
    keepPolling: () => delay(200).then(() => true), // poll really quickly
  };
  /** @type {import('../src/types.js').ChainStreamOptions} */
  const so = {
    integrity: 'none',
  };

  // The rest of this test is taken almost verbatim from the README.md, with
  // some minor modifications (testLeaderOptions and deepEqual).
  const leader = makeLeader(`http://localhost:${PORT}/network-config`, lo);
  const storeKey = makeStoreKey(':mailbox.agoric1foobarbaz');
  const stream = await makeChainStream(leader, storeKey, so);
  for await (const { value } of iterateLatest(stream)) {
    t.log(`here's a mailbox value`, value);

    // The rest here is to drive the test.
    t.deepEqual(value, expected.shift());
    if (expected.length === 0) {
      break;
    }
  }
});

test('bad network config', async t => {
  const PORT = await t.context.startServer(t, []);
  await t.throwsAsync(
    () =>
      makeLeader(`http://localhost:${PORT}/bad-network-config`, {
        retryCallback: null,
      }),
    {
      message: /rpcAddrs .* must be an array/,
    },
  );
});

test('missing rpc server', async t => {
  const PORT = await t.context.startServer(t, []);
  await t.throwsAsync(
    () =>
      makeLeader(`http://localhost:${PORT}/missing-network-config`, {
        retryCallback: null,
      }),
    {
      message: /^invalid json response body/,
    },
  );
});

test('unrecognized integrity', async t => {
  await t.throwsAsync(() => makeChainStream({}, {}, { integrity: 'bother' }), {
    message: /unrecognized stream integrity mode.*/,
  });
});

test.before(t => {
  t.context.cleanups = [];
  t.context.startServer = startFakeServer;
});

test.after(t => {
  t.context.cleanups.map(cleanup => cleanup());
});
