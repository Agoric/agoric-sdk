import { Fail, q } from '@endo/errors';

/** How old a node's latest block may be for the node to count as healthy. */
export const MAX_AGORIC_BLOCK_AGE_MS = 60_000;

/** How long to wait for a node to open a websocket and answer `status`. */
export const AGORIC_RPC_PROBE_TIMEOUT_MS = 15_000;

/** The parts of a CosmosRPCClient used here. */
type RpcClient = {
  opened(): Promise<void>;
  closed(): Promise<unknown>;
  close(): void;
  request(method: string, params: Record<string, never>): PromiseLike<unknown>;
};

/** The parts of a CometBFT `status` result checked here. */
type CometStatus = {
  node_info: { network: string };
  sync_info: {
    catching_up: boolean;
    latest_block_height: string;
    latest_block_time: string;
  };
};

const isRecord = (specimen: unknown): specimen is Record<string, unknown> =>
  typeof specimen === 'object' && specimen !== null;

const isCometStatus = (specimen: unknown): specimen is CometStatus => {
  if (!isRecord(specimen)) return false;
  const { node_info: nodeInfo, sync_info: syncInfo } = specimen;
  return (
    isRecord(nodeInfo) &&
    typeof nodeInfo.network === 'string' &&
    isRecord(syncInfo) &&
    typeof syncInfo.catching_up === 'boolean' &&
    typeof syncInfo.latest_block_height === 'string' &&
    typeof syncInfo.latest_block_time === 'string'
  );
};

export type AgoricRpcPowers<C extends RpcClient = RpcClient> = {
  makeRpcClient: (rpcAddr: string) => C;
  /** Wall-clock time in milliseconds, for comparing with block times. */
  now: () => number;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
};

export type AgoricRpcCriteria = {
  chainId: string;
  maxBlockAgeMs?: number;
  /** When false, only check the chain ID, not that the node is in sync. */
  requireSynced?: boolean;
  timeoutMs?: number;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  {
    setTimeout,
    clearTimeout,
  }: Pick<AgoricRpcPowers, 'setTimeout' | 'clearTimeout'>,
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
 * `requireSynced` is false, that it isn't catching up and has a recent block.
 * Returns its status (the CometBFT `status` result).
 */
export const checkAgoricRpcStatus = async (
  rpc: Pick<RpcClient, 'request'>,
  {
    chainId,
    maxBlockAgeMs = MAX_AGORIC_BLOCK_AGE_MS,
    requireSynced = true,
    now,
  }: Omit<AgoricRpcCriteria, 'timeoutMs'> & { now: () => number },
) => {
  const status = await rpc.request('status', {});
  if (!isCometStatus(status)) {
    throw Fail`Unexpected status result: ${status}`;
  }
  const network = status.node_info.network;
  network === chainId ||
    Fail`Expected chain ID ${q(chainId)}, got ${q(network)}`;
  if (!requireSynced) return status;
  const syncInfo = status.sync_info;
  const { catching_up: catchingUp, latest_block_height: height } = syncInfo;
  !catchingUp || Fail`Node is catching up at height ${q(height)}`;
  const blockAgeMs = now() - Date.parse(syncInfo.latest_block_time);
  // NaN (from an unparseable time) also fails this.
  blockAgeMs <= maxBlockAgeMs ||
    Fail`Latest block ${q(height)} is ${q(blockAgeMs)}ms old`;
  return status;
};

/**
 * Connect to the Agoric RPC node at `rpcAddr` and check its health per
 * `checkAgoricRpcStatus`. Resolves to the connected client, or closes it and
 * rejects.
 */
export const connectHealthyAgoricRpc = async <C extends RpcClient>(
  rpcAddr: string,
  { makeRpcClient, now, setTimeout, clearTimeout }: AgoricRpcPowers<C>,
  {
    timeoutMs = AGORIC_RPC_PROBE_TIMEOUT_MS,
    ...statusCriteria
  }: AgoricRpcCriteria,
) => {
  await null;
  const rpc = makeRpcClient(rpcAddr);
  // A failed connection rejects `closed()`; don't let that go unhandled.
  rpc.closed().catch(() => {});
  try {
    const status = await withTimeout(
      (async () => {
        await rpc.opened();
        return checkAgoricRpcStatus(rpc, { ...statusCriteria, now });
      })(),
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
 * Connect to the first healthy Agoric RPC node in `rpcAddrs`, in order. The
 * last one, having nothing to fall back to, need only serve the right chain.
 * Rejects if none qualifies.
 */
export const connectFirstHealthyAgoricRpc = async <C extends RpcClient>(
  rpcAddrs: readonly string[],
  powers: AgoricRpcPowers<C> & { log: (...args: unknown[]) => void },
  criteria: AgoricRpcCriteria,
) => {
  await null;
  rpcAddrs.length > 0 || Fail`No Agoric RPC endpoints`;
  const failures: string[] = [];
  for (const [index, rpcAddr] of rpcAddrs.entries()) {
    const isLast = index === rpcAddrs.length - 1;
    try {
      const { rpc, status } = await connectHealthyAgoricRpc(rpcAddr, powers, {
        ...criteria,
        requireSynced: !isLast && criteria.requireSynced !== false,
      });
      return { rpc, rpcAddr, index, status, failures };
    } catch (err) {
      powers.log(`Agoric RPC ${rpcAddr} is unavailable:`, err);
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${rpcAddr}: ${message}`);
    }
  }
  throw Fail`No healthy Agoric RPC among ${q(rpcAddrs)}: ${q(failures)}`;
};

/**
 * Resolve once the Agoric RPC node at `rpcAddr` has passed `healthyChecks`
 * consecutive health checks, one per `ticks` item.
 */
export const waitForHealthyAgoricRpc = async (
  rpcAddr: string,
  ticks: AsyncIterable<unknown>,
  powers: AgoricRpcPowers,
  { healthyChecks, ...criteria }: AgoricRpcCriteria & { healthyChecks: number },
) => {
  await null;
  let consecutive = 0;
  for await (const _ of ticks) {
    try {
      const { rpc } = await connectHealthyAgoricRpc(rpcAddr, powers, criteria);
      rpc.close();
      consecutive += 1;
      if (consecutive >= healthyChecks) return;
    } catch {
      consecutive = 0;
    }
  }
  throw Fail`Stopped checking Agoric RPC ${q(rpcAddr)}`;
};
