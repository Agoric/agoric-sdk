import { Fail, q } from '@endo/errors';

import type { CosmosRPCClient } from './cosmos-rpc.ts';

/** How old a node's latest block may be for the node to count as healthy. */
export const MAX_AGORIC_BLOCK_AGE_MS = 60_000;

/** How long to wait for a node to open a websocket and answer `status`. */
export const AGORIC_RPC_PROBE_TIMEOUT_MS = 15_000;

type RpcClient = Pick<
  CosmosRPCClient,
  'opened' | 'closed' | 'close' | 'request'
>;

export type AgoricRpcPowers<C extends RpcClient = RpcClient> = {
  makeRpcClient: (rpcAddr: string) => C;
  now: () => number;
  setTimeout: typeof globalThis.setTimeout;
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
  setTimeout: typeof globalThis.setTimeout,
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
  const network = status?.node_info?.network;
  network === chainId ||
    Fail`Expected chain ID ${q(chainId)}, got ${q(network)}`;
  if (!requireSynced) return status;
  const syncInfo = status?.sync_info ?? Fail`Missing sync_info in status`;
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
  { makeRpcClient, now, setTimeout }: AgoricRpcPowers<C>,
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
      setTimeout,
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
      failures.push(`${rpcAddr}: ${(err as Error)?.message ?? err}`);
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
