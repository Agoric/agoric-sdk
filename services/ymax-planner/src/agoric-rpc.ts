import { Fail, q } from '@endo/errors';

const AGORIC_CHAIN_ID_MISMATCH = 'AGORIC_CHAIN_ID_MISMATCH';
const AGORIC_RPC_PROBE_TIMEOUT_MS = 15 * 1000;
const MAX_AGORIC_BLOCK_AGE_MS = 60 * 1000;
const QUERY_PROBE = {
  data: '0a097075626c6973686564',
  height: '0',
  path: '/agoric.vstorage.Query/Children',
  prove: false,
};

type AgoricRpcCriteria = {
  chainId: string;
  maxBlockAgeMs?: number;
  requireSynced?: boolean;
  timeoutMs?: number;
};

type AgoricRpcPowers<C extends RpcClient = RpcClient> = {
  clearTimeout: typeof globalThis.clearTimeout;
  makeRpcClient: (rpcAddr: string) => C;
  now: () => number;
  setTimeout: typeof globalThis.setTimeout;
};

type CometStatus = {
  node_info: { network: string };
  sync_info: {
    catching_up: boolean;
    latest_block_height: string;
    latest_block_time: string;
  };
};

type RpcClient = {
  close(): void;
  closed(): Promise<unknown>;
  opened(): Promise<void>;
  request(
    method: string,
    params: Record<string, unknown>,
  ): PromiseLike<unknown>;
};

const checkAgoricRpcStatus = async (
  rpc: Pick<RpcClient, 'request'>,
  {
    chainId,
    maxBlockAgeMs = MAX_AGORIC_BLOCK_AGE_MS,
    now,
    requireSynced = true,
  }: Omit<AgoricRpcCriteria, 'timeoutMs'> & { now: () => number },
) => {
  const status = await rpc.request('status', {});

  if (!isCometStatus(status)) {
    throw Fail`Unexpected status result: ${status}`;
  }
  const network = status.node_info.network;
  if (network !== chainId) {
    const err = Error(
      `Expected chain ID ${JSON.stringify(chainId)}, got ${JSON.stringify(network)}`,
    );
    Object.defineProperty(err, 'code', {
      value: AGORIC_CHAIN_ID_MISMATCH,
      enumerable: true,
    });
    throw err;
  }

  if (!requireSynced) return status;
  const syncInfo = status.sync_info;
  const { catching_up: catchingUp, latest_block_height: height } = syncInfo;
  !catchingUp || Fail`Node is catching up at height ${q(height)}`;
  const blockAgeMs = now() - Date.parse(syncInfo.latest_block_time);
  blockAgeMs <= maxBlockAgeMs ||
    Fail`Latest block ${q(height)} is ${q(blockAgeMs)}ms old`;
  const queried = await rpc.request('abci_query', QUERY_PROBE);
  const response = isRecord(queried) ? queried.response : undefined;
  (isRecord(response) && response.code === 0) ||
    Fail`Query probe failed: ${queried}`;
  return status;
};

export const connectFirstHealthyAgoricRpc = async <C extends RpcClient>(
  criteria: AgoricRpcCriteria,
  powers: AgoricRpcPowers<C> & { log: (...args: unknown[]) => void },
  rpcAddrs: Array<string>,
) => {
  const failures: Array<string> = [];

  await null;

  !!rpcAddrs.length || Fail`No Agoric RPC endpoints`;

  for (const [index, rpcAddr] of rpcAddrs.entries()) {
    const isLast = index === rpcAddrs.length - 1;

    try {
      const { rpc, status } = await connectHealthyAgoricRpc(
        {
          ...criteria,
          requireSynced: !isLast && criteria.requireSynced !== false,
        },
        powers,
        rpcAddr,
      );
      return { failures, index, rpc, rpcAddr, status };
    } catch (err) {
      if (isChainIdMismatch(err))
        throw Error(`Agoric RPC ${rpcAddr} serves the wrong chain`, {
          cause: err,
        });

      powers.log(`Agoric RPC ${rpcAddr} is unavailable:`, err);
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${rpcAddr}: ${message}`);
    }
  }

  throw Fail`No healthy Agoric RPC among ${q(rpcAddrs)}: ${q(failures)}`;
};

const connectHealthyAgoricRpc = async <C extends RpcClient>(
  {
    timeoutMs = AGORIC_RPC_PROBE_TIMEOUT_MS,
    ...statusCriteria
  }: AgoricRpcCriteria,
  { makeRpcClient, now, setTimeout, clearTimeout }: AgoricRpcPowers<C>,
  rpcAddr: string,
) => {
  await null;

  const rpc = makeRpcClient(rpcAddr);
  rpc.closed().catch(() => {});

  const probe = async () => {
    await rpc.opened();
    return checkAgoricRpcStatus(rpc, { ...statusCriteria, now });
  };

  try {
    const status = await withTimeout(
      probe(),
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

const isChainIdMismatch = (err: unknown) =>
  isRecord(err) && err.code === AGORIC_CHAIN_ID_MISMATCH;

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

const isRecord = (specimen: unknown): specimen is Record<string, unknown> =>
  typeof specimen === 'object' && specimen !== null;

const probeAgoricRpc = async (
  criteria: AgoricRpcCriteria,
  powers: AgoricRpcPowers,
  rpcAddr: string,
) => {
  const { rpc } = await connectHealthyAgoricRpc(criteria, powers, rpcAddr);
  rpc.close();
};

export const waitForBetterAgoricRpc = async (
  {
    unhealthyChecks,
    ...criteria
  }: AgoricRpcCriteria & { unhealthyChecks: number },
  otherRpcAddrs: Array<string>,
  powers: AgoricRpcPowers & { log: (...args: Array<unknown>) => void },
  rpcAddr: string,
  ticks: AsyncIterable<unknown>,
) => {
  let consecutive = 0;

  await null;

  for await (const _ of ticks) {
    let failure: unknown;
    try {
      await probeAgoricRpc(criteria, powers, rpcAddr);
      consecutive = 0;
    } catch (err) {
      consecutive += 1;
      failure = err;
      powers.log(
        `Agoric RPC ${rpcAddr} failed health check (${consecutive} in a row):`,
        err,
      );
    }

    if (consecutive >= unhealthyChecks)
      for (const betterRpcAddr of otherRpcAddrs)
        try {
          await probeAgoricRpc(criteria, powers, betterRpcAddr);
          return { betterRpcAddr, failure };
        } catch {
          // Not better; stay unless another is.
        }
  }

  throw Fail`Stopped checking Agoric RPC ${q(rpcAddr)}`;
};

export const waitForHealthyAgoricRpc = async (
  { healthyChecks, ...criteria }: AgoricRpcCriteria & { healthyChecks: number },
  powers: AgoricRpcPowers,
  rpcAddr: string,
  ticks: AsyncIterable<unknown>,
) => {
  let consecutive = 0;

  await null;

  for await (const _ of ticks) {
    try {
      await probeAgoricRpc(criteria, powers, rpcAddr);
      consecutive += 1;
      if (consecutive >= healthyChecks) return;
    } catch {
      consecutive = 0;
    }
  }
  throw Fail`Stopped checking Agoric RPC ${q(rpcAddr)}`;
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
