import { Fail, q } from '@endo/errors';

import type { CosmosRPCClient } from './cosmos-rpc.ts';

/** How old a node's latest block may be for the node to count as healthy. */
export const MAX_AGORIC_BLOCK_AGE_MS = 60_000;

/**
 * How long to wait for a node to open a websocket and answer the health check's
 * requests.
 */
export const AGORIC_RPC_PROBE_TIMEOUT_MS = 15_000;

/** The `code` of the error for a node that serves another chain. */
export const AGORIC_CHAIN_ID_MISMATCH = 'AGORIC_CHAIN_ID_MISMATCH';

/**
 * A cheap query answered by the chain app, as the planner's own vstorage and
 * account queries are: the children of vstorage path "published".
 * cf. https://docs.cometbft.com/v0.38/rpc/#/ABCI/abci_query
 */
const QUERY_PROBE = {
  path: '/agoric.vstorage.Query/Children',
  // Hex of a protobuf-encoded QueryChildrenRequest { path: "published" }.
  data: '0a097075626c6973686564',
  height: '0',
  prove: false,
};

/** The parts of a CosmosRPCClient used here. */
type RpcClient = Pick<
  CosmosRPCClient,
  'opened' | 'closed' | 'close' | 'request'
>;

/**
 * The parts of a CometBFT `status` result checked here.
 * cf. https://docs.cometbft.com/v0.38/rpc/#/Info/status
 */
type CometStatus = {
  node_info: { network: string };
  sync_info: {
    catching_up: boolean;
    latest_block_height: string;
    latest_block_time: string;
  };
};

export type AgoricRpcOptions<C extends RpcClient = RpcClient> = {
  chainId: string;
  /**
   * When true, only check the chain ID, not that the node is in sync and
   * answers queries.
   */
  ignoreSyncInfo?: boolean;
  maxBlockAgeMs?: number;
  timeoutMs?: number;
  log: (...args: unknown[]) => void;
  makeRpcClient: (rpcAddr: string) => C;
  /** Wall-clock time in milliseconds, for comparing with block times. */
  now: () => number;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
};

const isObject = (specimen: unknown): specimen is { [key: string]: unknown } =>
  typeof specimen === 'object' && specimen !== null;

const isCometStatus = (specimen: unknown): specimen is CometStatus => {
  if (!isObject(specimen)) return false;
  const { node_info: nodeInfo, sync_info: syncInfo } = specimen;
  return (
    isObject(nodeInfo) &&
    typeof nodeInfo.network === 'string' &&
    isObject(syncInfo) &&
    typeof syncInfo.catching_up === 'boolean' &&
    typeof syncInfo.latest_block_height === 'string' &&
    typeof syncInfo.latest_block_time === 'string'
  );
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  {
    setTimeout,
    clearTimeout,
  }: Pick<AgoricRpcOptions, 'setTimeout' | 'clearTimeout'>,
  label: string,
): Promise<T> => {
  await null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Check that the node behind `rpc` serves `chainId` and, unless
 * `ignoreSyncInfo`, that it isn't catching up, has a recent block, and answers
 * a query to the chain app (a node can answer `status` promptly while its
 * queries stall). Returns its status (the CometBFT `status` result).
 */
export const checkAgoricRpcStatus = async (
  rpc: Pick<RpcClient, 'request'>,
  {
    chainId,
    ignoreSyncInfo = false,
    maxBlockAgeMs = MAX_AGORIC_BLOCK_AGE_MS,
    now,
  }: Pick<
    AgoricRpcOptions,
    'chainId' | 'ignoreSyncInfo' | 'maxBlockAgeMs' | 'now'
  >,
) => {
  const status: unknown = await rpc.request('status', {});
  if (!isCometStatus(status)) {
    throw Fail`Unexpected status result: ${status}`;
  }
  const {
    node_info: { network },
    sync_info: {
      catching_up: catchingUp,
      latest_block_height: blockHeight,
      latest_block_time: blockTime,
    },
  } = status;
  if (network !== chainId) {
    const err = Error(`Expected chain ID ${q(chainId)}, got ${q(network)}`);
    Object.defineProperty(err, 'code', {
      value: AGORIC_CHAIN_ID_MISMATCH,
      enumerable: true,
    });
    throw err;
  }

  if (!ignoreSyncInfo) {
    !catchingUp || Fail`Node is catching up at height ${q(blockHeight)}`;
    const blockAgeMs = now() - Date.parse(blockTime);
    // NaN (from an unparseable time) also fails this.
    blockAgeMs <= maxBlockAgeMs ||
      Fail`Latest block ${q(blockHeight)} is ${q(blockAgeMs)}ms old`;
    const queryProbeResult: unknown = await rpc.request(
      'abci_query',
      QUERY_PROBE,
    );
    const response = isObject(queryProbeResult)
      ? queryProbeResult.response
      : undefined;
    (isObject(response) && response.code === 0) ||
      Fail`Query probe failed: ${queryProbeResult}`;
  }

  return status;
};

/**
 * Connect to the Agoric RPC node at `rpcAddr` and check its health per
 * `checkAgoricRpcStatus`. Resolves to the connected client, or closes it and
 * rejects.
 */
export const connectHealthyAgoricRpc = async <C extends RpcClient>(
  rpcAddr: string,
  {
    makeRpcClient,
    setTimeout,
    clearTimeout,
    timeoutMs = AGORIC_RPC_PROBE_TIMEOUT_MS,
    ...statusOptions
  }: AgoricRpcOptions<C>,
) => {
  await null;
  const rpc = makeRpcClient(rpcAddr);
  // A failed connection rejects `closed()`; don't let that go unhandled.
  rpc.closed().catch(() => {});
  try {
    // A timeout doesn't stop the check itself, which instead ends when
    // `close()` below rejects its pending requests.
    const status = await withTimeout(
      rpc.opened().then(() => checkAgoricRpcStatus(rpc, statusOptions)),
      timeoutMs,
      { setTimeout, clearTimeout },
      `Probing Agoric RPC ${rpcAddr}`,
    );
    return { rpc, status };
  } catch (err) {
    rpc.close();
    throw err;
  }
};

/**
 * Connect to the first healthy Agoric RPC node in `rpcAddrs`, in order. If
 * none is healthy (as during a chain halt, when no node has a recent block),
 * settle for the first one that serves the right chain, with `healthy: false`.
 * Rejects if none does, or as soon as one serves another chain: that is a
 * configuration error, which falling back would hide.
 */
export const connectFirstHealthyAgoricRpc = async <C extends RpcClient>(
  rpcAddrs: string[],
  options: AgoricRpcOptions<C>,
) => {
  await null;
  rpcAddrs.length > 0 || Fail`No Agoric RPC endpoints`;
  const failures: string[] = [];
  const tryConnect = async (rpcAddr: string, ignoreSyncInfo: boolean) => {
    await null;
    try {
      return await connectHealthyAgoricRpc(rpcAddr, {
        ...options,
        ignoreSyncInfo,
      });
    } catch (err) {
      if (isObject(err) && err.code === AGORIC_CHAIN_ID_MISMATCH) {
        throw Error(`Agoric RPC ${rpcAddr} serves the wrong chain`, {
          cause: err,
        });
      }
      options.log(`Agoric RPC ${rpcAddr} is unavailable:`, err);
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${rpcAddr}: ${message}`);
      return undefined;
    }
  };
  for (const ignoreSyncInfo of [false, true]) {
    for (const [index, rpcAddr] of rpcAddrs.entries()) {
      const connected = await tryConnect(rpcAddr, ignoreSyncInfo);
      if (connected) {
        const healthy = !ignoreSyncInfo;
        return { ...connected, rpcAddr, index, healthy, failures };
      }
    }
  }
  throw Fail`No usable Agoric RPC among ${q(rpcAddrs)}: ${q(failures)}`;
};

/** Check the health of the node at `rpcAddr` over a connection of its own. */
const probeAgoricRpc = async (rpcAddr: string, options: AgoricRpcOptions) => {
  const { rpc } = await connectHealthyAgoricRpc(rpcAddr, options);
  rpc.close();
};

/**
 * Monitor `rpcAddr` once per tick, seeking a healthy alternative from
 * `otherRpcAddrs` after `failureCount` consecutive failures and fulfilling the
 * result promise if one is found that has itself been healthy for at least
 * `otherCount` consecutive ticks.
 *
 * An undefined `rpcAddr` is permanently failing, so the result is the first of
 * `otherRpcAddrs` to be healthy for `otherCount` ticks. A tick on which
 * `isStalled()` is true counts as `failureCount` failures, so an alternative is
 * sought right away, but only taken if healthy: during a chain halt, every node
 * is stalled.
 */
export const waitForBetterAgoricRpc = async (
  rpcAddr: string | undefined,
  otherRpcAddrs: string[],
  {
    ticks,
    failureCount = 1,
    otherCount = 1,
    isStalled = () => false,
    ...options
  }: AgoricRpcOptions & {
    ticks: AsyncIterable<unknown>;
    failureCount?: number;
    otherCount?: number;
    isStalled?: () => boolean;
  },
) => {
  let failureRecord: undefined | { failure: unknown; count: number } = rpcAddr
    ? undefined
    : // A missing preferred target is permanently in "failure" mode.
      { failure: null, count: Infinity };
  const successCounts = new Map<string, number>();
  await null;
  for await (const _ of ticks) {
    if (rpcAddr) {
      const count = (failureRecord?.count || 0) + 1;
      if (isStalled()) {
        const failure = Error(`Agoric RPC ${rpcAddr} stalled`);
        failureRecord = { failure, count: Math.max(count, failureCount) };
        options.log(`${failure.message}; seeking a healthy alternative`);
      } else {
        try {
          await probeAgoricRpc(rpcAddr, options);
          failureRecord = undefined;
        } catch (failure) {
          // Keep the most recent failure.
          failureRecord = { failure, count };
          options.log(
            `Agoric RPC ${rpcAddr} failed health check (${count} in a row):`,
            failure,
          );
        }
      }
    }
    if (otherCount <= 1 && (failureRecord?.count || 0) < failureCount) continue;

    for (const betterRpcAddr of otherRpcAddrs) {
      try {
        await probeAgoricRpc(betterRpcAddr, options);
        const successCount = (successCounts.get(betterRpcAddr) || 0) + 1;
        successCounts.set(betterRpcAddr, successCount);
        if (successCount >= otherCount && failureRecord) {
          return { ...failureRecord, betterRpcAddr };
        }
      } catch {
        // Not better; ignore this probe failure.
        successCounts.set(betterRpcAddr, 0);
      }
    }
  }

  throw Fail`Stopped checking Agoric RPC ${q(rpcAddr)}`;
};

/**
 * Resolve to the reason the planner should restart to use an Agoric RPC other
 * than `rpcAddr` (the one in use, of `rpcAddrs` in order of preference):
 *
 * - `rpcAddr` fails `unhealthyCheckCount` consecutive health checks (one per
 *   tick of `makeTicks()`), or its subscriptions get no notification between
 *   two ticks, while another is healthy.
 * - On a fallback, the preferred one passes `preferredHealthyCheckCount`
 *   consecutive health checks.
 *
 * Never resolves if `rpcAddrs` has no other.
 */
export const waitForAgoricRpcSwitch = async (
  rpcAddrs: string[],
  rpcAddr: string,
  {
    makeTicks,
    notificationCount,
    preferredHealthyCheckCount,
    unhealthyCheckCount,
    ...options
  }: AgoricRpcOptions & {
    makeTicks: () => AsyncIterable<unknown>;
    /** How many subscription notifications `rpcAddr` has delivered. */
    notificationCount: () => number;
    preferredHealthyCheckCount: number;
    unhealthyCheckCount: number;
  },
): Promise<string> => {
  const [preferredRpcAddr] = rpcAddrs;
  const otherRpcAddrs = rpcAddrs.filter(addr => addr !== rpcAddr);
  if (!otherRpcAddrs.length) return new Promise<never>(() => {});

  // We want to switch if our choice is persistently unhealthy while another is
  // not.
  let lastNotificationCount = notificationCount();
  const isStalled = () => {
    const count = notificationCount();
    const stalled = count === lastNotificationCount;
    lastNotificationCount = count;
    return stalled;
  };
  const betterRpcP = waitForBetterAgoricRpc(rpcAddr, otherRpcAddrs, {
    ...options,
    ticks: makeTicks(),
    failureCount: unhealthyCheckCount,
    isStalled,
  }).then(
    ({ betterRpcAddr, failure }) =>
      `Agoric RPC ${rpcAddr} is unhealthy (${String(failure)}); switching to ${betterRpcAddr}`,
  );
  if (rpcAddr === preferredRpcAddr) return betterRpcP;

  // On a fallback, we also want to switch once the preferred one recovers.
  const preferredRpcRecoveredP = waitForBetterAgoricRpc(
    undefined,
    [preferredRpcAddr],
    {
      ...options,
      ticks: makeTicks(),
      otherCount: preferredHealthyCheckCount,
    },
  ).then(
    () =>
      `Preferred Agoric RPC ${preferredRpcAddr} recovered; switching back to it from ${rpcAddr}`,
  );
  return Promise.race([betterRpcP, preferredRpcRecoveredP]);
};
