// Roughly equal to block interval
const STATUS_CACHE_TTL_MS = 5 * 1000;

let statusCache: { promise: Promise<void>; timestamp: number } | null = null;

export const verifyStatus = (
  { now }: { now: () => number },
  rpcAddress: string,
) => {
  const currentTimestamp = now();
  if (
    statusCache &&
    currentTimestamp - statusCache.timestamp < STATUS_CACHE_TTL_MS
  )
    return statusCache.promise;

  const promise = (async () => {
    const url = `${rpcAddress}/status`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(STATUS_CACHE_TTL_MS / 2),
    });
    if (!response.ok) throw Error(`Unable to connect to ${url}`);

    const json = (await response.json()) as {
      result: {
        node_info: { id: string };
        sync_info: { catching_up: boolean; latest_block_height: string };
      };
    };
    if (json.result.sync_info.catching_up)
      throw Error(
        `Node ${json.result.node_info.id} falling behind at height ${json.result.sync_info.latest_block_height}`,
      );
  })();

  statusCache = { timestamp: currentTimestamp, promise };
  return promise;
};
