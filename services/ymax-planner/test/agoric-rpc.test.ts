import test from 'ava';

import {
  checkAgoricRpcStatus,
  connectFirstHealthyAgoricRpc,
  isChainIdMismatch,
  waitForBetterAgoricRpc,
  waitForHealthyAgoricRpc,
} from '../src/agoric-rpc.ts';

const NOW = Date.parse('2026-11-18T12:00:00Z');
const CHAIN_ID = 'agoric-3';
const FOLLOWER = 'https://follower.rpc.example:443';
const ARCHIVE = 'https://archive.rpc.example:443';

type NodeBehavior = {
  network?: string;
  catchingUp?: boolean;
  blockAgeMs?: number;
  /** The ABCI code of query responses. */
  queryCode?: number;
  /** Never answer queries. */
  queryHang?: boolean;
  /** Reject `opened()` with this message. */
  openError?: string;
  /** Never open. */
  hang?: boolean;
};

const makeStatus = ({
  network = CHAIN_ID,
  catchingUp = false,
  blockAgeMs = 1_000,
}: NodeBehavior) => ({
  node_info: { network },
  sync_info: {
    catching_up: catchingUp,
    latest_block_height: '123',
    latest_block_time: new Date(NOW - blockAgeMs).toISOString(),
  },
});

const makeRequest = (behavior: NodeBehavior) => async (method: string) => {
  if (method === 'status') return makeStatus(behavior);
  if (method !== 'abci_query') throw Error(`unexpected method ${method}`);
  if (behavior.queryHang) return new Promise<never>(() => {});
  return { response: { code: behavior.queryCode ?? 0, value: '' } };
};

const makeFakeRpcs = (behaviors: Record<string, NodeBehavior>) => {
  const made: Array<{ rpcAddr: string; closed: boolean }> = [];
  const makeRpcClient = (rpcAddr: string) => {
    const behavior = behaviors[rpcAddr] ?? { openError: 'unknown endpoint' };
    const record = { rpcAddr, closed: false };
    made.push(record);
    const closedPK = Promise.withResolvers<void>();
    return {
      rpcAddr,
      opened: () =>
        behavior.hang
          ? new Promise<void>(() => {})
          : behavior.openError
            ? Promise.reject(Error(behavior.openError))
            : Promise.resolve(),
      closed: () => closedPK.promise,
      close: () => {
        record.closed = true;
        closedPK.resolve(undefined);
      },
      request: makeRequest(behavior),
    };
  };
  const powers = {
    makeRpcClient,
    now: () => NOW,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    log: () => {},
  };
  return { made, powers };
};

test('checkAgoricRpcStatus accepts a synced node of the expected chain', async t => {
  const rpc = { request: makeRequest({}) };
  const status = await checkAgoricRpcStatus(rpc, {
    chainId: CHAIN_ID,
    now: () => NOW,
  });
  t.is(status.sync_info.latest_block_height, '123');
});

test('checkAgoricRpcStatus rejects an unhealthy node', async t => {
  const check = (behavior: NodeBehavior, requireSynced?: boolean) =>
    checkAgoricRpcStatus(
      { request: makeRequest(behavior) },
      {
        chainId: CHAIN_ID,
        now: () => NOW,
        requireSynced,
      },
    );
  await t.throwsAsync(check({ network: 'agoricdev-25' }), {
    message: /Expected chain ID "agoric-3", got "agoricdev-25"/,
  });
  await t.throwsAsync(check({ catchingUp: true }), {
    message: /catching up at height "123"/,
  });
  await t.throwsAsync(check({ blockAgeMs: 120_000 }), {
    message: /is 120000ms old/,
  });
  await t.throwsAsync(check({ queryCode: 1 }), {
    message: /Query probe failed/,
  });
  // Without requireSynced, only the chain ID matters.
  await t.notThrowsAsync(
    check({ catchingUp: true, blockAgeMs: 120_000, queryCode: 1 }, false),
  );
  const mismatch = await t.throwsAsync(
    check({ network: 'agoricdev-25' }, false),
  );
  t.true(isChainIdMismatch(mismatch));
});

test('connectFirstHealthyAgoricRpc prefers the first healthy endpoint', async t => {
  const { made, powers } = makeFakeRpcs({ [FOLLOWER]: {}, [ARCHIVE]: {} });
  const { rpc, rpcAddr, index, failures } = await connectFirstHealthyAgoricRpc(
    [FOLLOWER, ARCHIVE],
    powers,
    { chainId: CHAIN_ID },
  );
  t.is(rpcAddr, FOLLOWER);
  t.is(rpc.rpcAddr, FOLLOWER);
  t.is(index, 0);
  t.deepEqual(failures, []);
  t.deepEqual(made, [{ rpcAddr: FOLLOWER, closed: false }]);
});

test('connectFirstHealthyAgoricRpc falls back past unhealthy endpoints', async t => {
  const unhealthyFollowers: NodeBehavior[] = [
    { openError: 'Unexpected server response: 522' },
    { catchingUp: true },
    { blockAgeMs: 300_000 },
    { hang: true },
    // Answers `status` promptly, but its queries stall.
    { queryHang: true },
  ];
  for (const follower of unhealthyFollowers) {
    const { made, powers } = makeFakeRpcs({
      [FOLLOWER]: follower,
      [ARCHIVE]: {},
    });
    const { rpcAddr, index, failures } = await connectFirstHealthyAgoricRpc(
      [FOLLOWER, ARCHIVE],
      powers,
      { chainId: CHAIN_ID, timeoutMs: 50 },
    );
    t.is(rpcAddr, ARCHIVE, `follower ${JSON.stringify(follower)}`);
    t.is(index, 1);
    t.is(failures.length, 1);
    t.true(failures[0].startsWith(`${FOLLOWER}: `));
    // The unhealthy client is closed; the selected one stays open.
    t.deepEqual(made, [
      { rpcAddr: FOLLOWER, closed: true },
      { rpcAddr: ARCHIVE, closed: false },
    ]);
  }
});

test('connectFirstHealthyAgoricRpc accepts an out-of-sync last endpoint', async t => {
  const { powers } = makeFakeRpcs({
    [FOLLOWER]: { openError: 'down' },
    [ARCHIVE]: { catchingUp: true },
  });
  const { rpcAddr } = await connectFirstHealthyAgoricRpc(
    [FOLLOWER, ARCHIVE],
    powers,
    { chainId: CHAIN_ID },
  );
  t.is(rpcAddr, ARCHIVE);
});

test('connectFirstHealthyAgoricRpc rejects when no endpoint qualifies', async t => {
  const { powers } = makeFakeRpcs({
    [FOLLOWER]: { openError: 'down' },
    [ARCHIVE]: { hang: true },
  });
  await t.throwsAsync(
    connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], powers, {
      chainId: CHAIN_ID,
      timeoutMs: 50,
    }),
    { message: /No healthy Agoric RPC among .*down.*timed out/s },
  );
});

test('connectFirstHealthyAgoricRpc does not fall back from the wrong chain', async t => {
  const { made, powers } = makeFakeRpcs({
    [FOLLOWER]: { network: 'agoricdev-25' },
    [ARCHIVE]: {},
  });
  const err = await t.throwsAsync(
    connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], powers, {
      chainId: CHAIN_ID,
    }),
    { message: `Agoric RPC ${FOLLOWER} serves the wrong chain` },
  );
  t.true(isChainIdMismatch(err?.cause));
  t.deepEqual(made, [{ rpcAddr: FOLLOWER, closed: true }]);
});

test('waitForHealthyAgoricRpc needs consecutive healthy checks', async t => {
  const behaviors: Record<string, NodeBehavior> = {};
  const { made, powers } = makeFakeRpcs(behaviors);
  // Healthy, down (resetting the count), then healthy twice.
  const sequence: NodeBehavior[] = [{}, { openError: 'down' }, {}, {}];
  async function* ticks() {
    for (const behavior of sequence) {
      behaviors[FOLLOWER] = behavior;
      yield;
    }
  }
  await waitForHealthyAgoricRpc(FOLLOWER, ticks(), powers, {
    chainId: CHAIN_ID,
    healthyChecks: 2,
  });
  t.is(made.length, 4);
  t.true(made.every(({ closed }) => closed));
});

test('waitForHealthyAgoricRpc rejects when the checks stop', async t => {
  const { powers } = makeFakeRpcs({ [FOLLOWER]: {} });
  async function* ticks() {
    yield;
  }
  await t.throwsAsync(
    waitForHealthyAgoricRpc(FOLLOWER, ticks(), powers, {
      chainId: CHAIN_ID,
      healthyChecks: 2,
    }),
    { message: /Stopped checking/ },
  );
});

test('waitForBetterAgoricRpc needs consecutive unhealthy checks and a healthy other', async t => {
  const behaviors: Record<string, NodeBehavior> = {};
  const { made, powers } = makeFakeRpcs(behaviors);
  const stalled: NodeBehavior = { queryHang: true };
  // Each tick sets the health of the follower in use and of the archive.
  const sequence: Array<[NodeBehavior, NodeBehavior]> = [
    [stalled, {}],
    // A healthy check resets the count.
    [{}, {}],
    [stalled, {}],
    // Unhealthy twice in a row, but so is the other: stay.
    [stalled, { openError: 'down' }],
    [stalled, {}],
  ];
  async function* ticks() {
    for (const [follower, archive] of sequence) {
      behaviors[FOLLOWER] = follower;
      behaviors[ARCHIVE] = archive;
      yield;
    }
  }
  const { betterRpcAddr, failure } = await waitForBetterAgoricRpc(
    FOLLOWER,
    [ARCHIVE],
    ticks(),
    powers,
    { chainId: CHAIN_ID, unhealthyChecks: 2, timeoutMs: 50 },
  );
  t.is(betterRpcAddr, ARCHIVE);
  t.regex(String(failure), /timed out after 50ms/);
  // The archive is only probed once the follower has failed twice in a row.
  t.deepEqual(
    made.map(({ rpcAddr }) => rpcAddr),
    [FOLLOWER, FOLLOWER, FOLLOWER, FOLLOWER, ARCHIVE, FOLLOWER, ARCHIVE],
  );
  t.true(made.every(({ closed }) => closed));
});

test('waitForBetterAgoricRpc rejects when the checks stop', async t => {
  const { powers } = makeFakeRpcs({ [FOLLOWER]: {}, [ARCHIVE]: {} });
  async function* ticks() {
    yield;
  }
  await t.throwsAsync(
    waitForBetterAgoricRpc(FOLLOWER, [ARCHIVE], ticks(), powers, {
      chainId: CHAIN_ID,
      unhealthyChecks: 1,
    }),
    { message: /Stopped checking/ },
  );
});
