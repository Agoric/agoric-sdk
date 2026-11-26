import test from 'ava';

import {
  AGORIC_CHAIN_ID_MISMATCH,
  checkAgoricRpcStatus,
  connectFirstHealthyAgoricRpc,
  waitForAgoricRpcSwitch,
  waitForBetterAgoricRpc,
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
    const closedPK = Promise.withResolvers<{
      code: number;
      reason: string;
      wasClean: boolean;
    }>();
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
        closedPK.resolve({ code: 1000, reason: '', wasClean: true });
      },
      request: makeRequest(behavior),
    };
  };
  const options = {
    chainId: CHAIN_ID,
    makeRpcClient,
    now: () => NOW,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    log: () => {},
  };
  return { made, options };
};

/** Whether `specimen` is an error for a node serving another chain. */
const isChainIdMismatch = (specimen: unknown) =>
  specimen instanceof Error &&
  'code' in specimen &&
  specimen.code === AGORIC_CHAIN_ID_MISMATCH;

/** Ticks that each first apply the next `behaviors` to the nodes. */
const makeTicks = (
  behaviors: Record<string, NodeBehavior>,
  sequence: Array<Record<string, NodeBehavior>>,
) =>
  (async function* () {
    for (const step of sequence) {
      Object.assign(behaviors, step);
      yield;
    }
  })();

test('checkAgoricRpcStatus accepts a synced node of the expected chain', async t => {
  const rpc = { request: makeRequest({}) };
  const status = await checkAgoricRpcStatus(rpc, {
    chainId: CHAIN_ID,
    now: () => NOW,
  });
  t.is(status.sync_info.latest_block_height, '123');
});

test('checkAgoricRpcStatus rejects an unhealthy node', async t => {
  const check = (behavior: NodeBehavior, ignoreSyncInfo?: boolean) =>
    checkAgoricRpcStatus(
      { request: makeRequest(behavior) },
      {
        chainId: CHAIN_ID,
        now: () => NOW,
        ignoreSyncInfo,
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
  // With ignoreSyncInfo, only the chain ID matters.
  await t.notThrowsAsync(
    check({ catchingUp: true, blockAgeMs: 120_000, queryCode: 1 }, true),
  );
  const mismatch = await t.throwsAsync(
    check({ network: 'agoricdev-25' }, true),
  );
  t.true(isChainIdMismatch(mismatch));
});

test('connectFirstHealthyAgoricRpc prefers the first healthy endpoint', async t => {
  const { made, options } = makeFakeRpcs({ [FOLLOWER]: {}, [ARCHIVE]: {} });
  const { rpc, rpcAddr, index, healthy, failures } =
    await connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], options);
  t.is(rpcAddr, FOLLOWER);
  t.is(rpc.rpcAddr, FOLLOWER);
  t.is(index, 0);
  t.true(healthy);
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
    const { made, options } = makeFakeRpcs({
      [FOLLOWER]: follower,
      [ARCHIVE]: {},
    });
    const { rpcAddr, index, healthy, failures } =
      await connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], {
        ...options,
        timeoutMs: 50,
      });
    t.is(rpcAddr, ARCHIVE, `follower ${JSON.stringify(follower)}`);
    t.is(index, 1);
    t.true(healthy);
    t.is(failures.length, 1);
    t.true(failures[0].startsWith(`${FOLLOWER}: `));
    // The unhealthy client is closed; the selected one stays open.
    t.deepEqual(made, [
      { rpcAddr: FOLLOWER, closed: true },
      { rpcAddr: ARCHIVE, closed: false },
    ]);
  }
});

test('connectFirstHealthyAgoricRpc settles for the first endpoint of the chain when none is healthy', async t => {
  // As during a chain halt: no node has a recent block.
  const { options } = makeFakeRpcs({
    [FOLLOWER]: { blockAgeMs: 300_000 },
    [ARCHIVE]: { blockAgeMs: 300_000 },
  });
  const { rpcAddr, index, healthy, failures } =
    await connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], options);
  t.is(rpcAddr, FOLLOWER);
  t.is(index, 0);
  t.false(healthy);
  t.is(failures.length, 2);

  // An unreachable endpoint is passed over.
  const { options: options2 } = makeFakeRpcs({
    [FOLLOWER]: { openError: 'down' },
    [ARCHIVE]: { catchingUp: true },
  });
  const second = await connectFirstHealthyAgoricRpc(
    [FOLLOWER, ARCHIVE],
    options2,
  );
  t.is(second.rpcAddr, ARCHIVE);
  t.false(second.healthy);
});

test('connectFirstHealthyAgoricRpc rejects when no endpoint is usable', async t => {
  const { options } = makeFakeRpcs({
    [FOLLOWER]: { openError: 'down' },
    [ARCHIVE]: { hang: true },
  });
  await t.throwsAsync(
    connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], {
      ...options,
      timeoutMs: 50,
    }),
    { message: /No usable Agoric RPC among .*down.*timed out/s },
  );
});

test('connectFirstHealthyAgoricRpc does not fall back from the wrong chain', async t => {
  const { made, options } = makeFakeRpcs({
    [FOLLOWER]: { network: 'agoricdev-25' },
    [ARCHIVE]: {},
  });
  const err = await t.throwsAsync(
    connectFirstHealthyAgoricRpc([FOLLOWER, ARCHIVE], options),
    { message: `Agoric RPC ${FOLLOWER} serves the wrong chain` },
  );
  t.true(isChainIdMismatch(err?.cause));
  t.deepEqual(made, [{ rpcAddr: FOLLOWER, closed: true }]);
});

test('waitForBetterAgoricRpc without a target needs consecutive healthy checks of another', async t => {
  const behaviors: Record<string, NodeBehavior> = {};
  const { made, options } = makeFakeRpcs(behaviors);
  // Healthy, down (resetting the count), then healthy twice.
  const ticks = makeTicks(behaviors, [
    { [FOLLOWER]: {} },
    { [FOLLOWER]: { openError: 'down' } },
    { [FOLLOWER]: {} },
    { [FOLLOWER]: {} },
  ]);
  const { betterRpcAddr } = await waitForBetterAgoricRpc(
    undefined,
    [FOLLOWER],
    { ...options, ticks, otherCount: 2 },
  );
  t.is(betterRpcAddr, FOLLOWER);
  t.is(made.length, 4);
  t.true(made.every(({ closed }) => closed));
});

test('waitForBetterAgoricRpc needs consecutive unhealthy checks and a healthy other', async t => {
  const behaviors: Record<string, NodeBehavior> = {};
  const { made, options } = makeFakeRpcs(behaviors);
  const stalled: NodeBehavior = { queryHang: true };
  // Each tick sets the health of the follower in use and of the archive.
  const ticks = makeTicks(behaviors, [
    { [FOLLOWER]: stalled, [ARCHIVE]: {} },
    // A healthy check resets the count.
    { [FOLLOWER]: {}, [ARCHIVE]: {} },
    { [FOLLOWER]: stalled, [ARCHIVE]: {} },
    // Unhealthy twice in a row, but so is the other: stay.
    { [FOLLOWER]: stalled, [ARCHIVE]: { openError: 'down' } },
    { [FOLLOWER]: stalled, [ARCHIVE]: {} },
  ]);
  const { betterRpcAddr, failure } = await waitForBetterAgoricRpc(
    FOLLOWER,
    [ARCHIVE],
    { ...options, ticks, failureCount: 2, timeoutMs: 50 },
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

test('waitForBetterAgoricRpc seeks another right away when stalled', async t => {
  const behaviors: Record<string, NodeBehavior> = {};
  const { made, options } = makeFakeRpcs(behaviors);
  const ticks = makeTicks(behaviors, [
    // Stalled, but the other is no better: stay.
    { [FOLLOWER]: {}, [ARCHIVE]: { openError: 'down' } },
    { [FOLLOWER]: {}, [ARCHIVE]: {} },
  ]);
  const { betterRpcAddr, failure } = await waitForBetterAgoricRpc(
    FOLLOWER,
    [ARCHIVE],
    { ...options, ticks, failureCount: 3, isStalled: () => true },
  );
  t.is(betterRpcAddr, ARCHIVE);
  t.regex(String(failure), /stalled/);
  // A stalled target isn't probed itself.
  t.deepEqual(
    made.map(({ rpcAddr }) => rpcAddr),
    [ARCHIVE, ARCHIVE],
  );
});

test('waitForBetterAgoricRpc rejects when the checks stop', async t => {
  const { options } = makeFakeRpcs({ [FOLLOWER]: {}, [ARCHIVE]: {} });
  async function* ticks() {
    yield;
  }
  await t.throwsAsync(
    waitForBetterAgoricRpc(FOLLOWER, [ARCHIVE], {
      ...options,
      ticks: ticks(),
      failureCount: 1,
    }),
    { message: /Stopped checking/ },
  );
});

test('waitForAgoricRpcSwitch stays through a chain halt', async t => {
  // Every node has an old block and the subscription delivers nothing.
  const stale: NodeBehavior = { blockAgeMs: 300_000 };
  const behaviors: Record<string, NodeBehavior> = {};
  const { made, options } = makeFakeRpcs(behaviors);
  const sequence = Array.from({ length: 10 }, () => ({
    [FOLLOWER]: stale,
    [ARCHIVE]: stale,
  }));
  const switchP = waitForAgoricRpcSwitch([FOLLOWER, ARCHIVE], FOLLOWER, {
    ...options,
    makeTicks: () => makeTicks(behaviors, sequence),
    notificationCount: () => 0,
    preferredHealthyCheckCount: 5,
    unhealthyCheckCount: 3,
  });
  // It only stops because the ticks run out, never to switch.
  await t.throwsAsync(switchP, { message: /Stopped checking/ });
  // Every tick probed the other, finding it no better.
  t.is(made.filter(({ rpcAddr }) => rpcAddr === ARCHIVE).length, 10);
});

test('waitForAgoricRpcSwitch switches from a stalled subscription to a healthy other', async t => {
  const behaviors: Record<string, NodeBehavior> = {};
  const { options } = makeFakeRpcs(behaviors);
  let notifications = 0;
  const ticks = (async function* () {
    // A notification arrived since the start: not stalled.
    notifications += 1;
    Object.assign(behaviors, { [FOLLOWER]: {}, [ARCHIVE]: {} });
    yield;
    // None since: stalled.
    yield;
  })();
  const reason = await waitForAgoricRpcSwitch([FOLLOWER, ARCHIVE], FOLLOWER, {
    ...options,
    makeTicks: () => ticks,
    notificationCount: () => notifications,
    preferredHealthyCheckCount: 5,
    unhealthyCheckCount: 3,
  });
  t.is(
    reason,
    `Agoric RPC ${FOLLOWER} is unhealthy (Error: Agoric RPC ${FOLLOWER} stalled); switching to ${ARCHIVE}`,
  );
});

test('waitForAgoricRpcSwitch returns to the preferred one once it recovers', async t => {
  const behaviors: Record<string, NodeBehavior> = {
    [FOLLOWER]: {},
    [ARCHIVE]: {},
  };
  const { options } = makeFakeRpcs(behaviors);
  let notifications = 0;
  const reason = await waitForAgoricRpcSwitch([FOLLOWER, ARCHIVE], ARCHIVE, {
    ...options,
    // Enough ticks for the preferred one to pass twice, with notifications
    // so that the one in use isn't stalled.
    makeTicks: () =>
      (async function* () {
        for (let i = 0; i < 3; i += 1) {
          notifications += 1;
          yield;
        }
      })(),
    notificationCount: () => notifications,
    preferredHealthyCheckCount: 2,
    unhealthyCheckCount: 3,
  });
  t.is(
    reason,
    `Preferred Agoric RPC ${FOLLOWER} recovered; switching back to it from ${ARCHIVE}`,
  );
});

test('waitForAgoricRpcSwitch never resolves without another endpoint', async t => {
  const { made, options } = makeFakeRpcs({ [FOLLOWER]: {} });
  const switchP = waitForAgoricRpcSwitch([FOLLOWER], FOLLOWER, {
    ...options,
    makeTicks: () => makeTicks({}, [{}, {}]),
    notificationCount: () => 0,
    preferredHealthyCheckCount: 5,
    unhealthyCheckCount: 3,
  });
  const settled = await Promise.race([
    switchP.then(() => true),
    new Promise(resolve => setTimeout(resolve, 50, false)),
  ]);
  t.false(settled);
  t.deepEqual(made, []);
});
