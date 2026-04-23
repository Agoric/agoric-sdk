#!/usr/bin/env -S node --import ts-blank-space/register
/** @file query upgrade run slogs for a ymax control tx */

import {
  getControlAddress,
  isPortfolioContract,
} from '@agoric/portfolio-api/src/portfolio-constants.js';
import { URLSearchParams } from 'node:url';
import { parseArgs } from 'node:util';

const usage = `Usage:
  packages/portfolio-deploy/scripts/ymax-upgrade-run-logs.ts [options]

Options:
  --contract <ymax0|ymax1>     Contract name (default: ymax0)
  --network <devnet|main>      Network (default: devnet)
  --address <bech32>           Override ymaxControl address
  --tx-hash <hash>             Use a specific tx hash instead of latest sender tx
  --namespace <name>           Kubernetes namespace label (default: network)
  --pod <name>                 Pod name filter (default: validator-0 on devnet)
  --pretty                     Print a single pretty JSON object instead of NDJSON
  --tx-limit <n>               Recent txs to inspect from sender (default: 20)
  --window-minutes <n>         Minutes before/after tx time for log query (default: 15)
  --raw                        Print raw Grafana JSON instead of flattened rows
  --help                       Show this help
`;

const options = {
  address: { type: 'string' },
  contract: { type: 'string', default: 'ymax0' },
  help: { type: 'boolean', default: false, short: 'h' },
  namespace: { type: 'string' },
  network: { type: 'string', default: 'devnet' },
  pod: { type: 'string' },
  pretty: { type: 'boolean', default: false },
  raw: { type: 'boolean', default: false },
  'tx-hash': { type: 'string' },
  'tx-limit': { type: 'string', default: '20' },
  'window-minutes': { type: 'string', default: '15' },
} as const;

type Network = 'devnet' | 'main';

type NetworkConfig = {
  apiAddrs?: string[];
};

type TxResponse = {
  tx_responses?: ChainTx[];
};

type SingleTxResponse = {
  tx_response?: ChainTx;
};

type ChainTx = {
  height: string;
  txhash: string;
  timestamp?: string;
  tx?: {
    body?: {
      messages?: Array<{
        owner?: string;
        spend_action?: string;
      }>;
    };
  };
};

type GrafanaResponse = {
  results?: Record<
    string,
    {
      status?: number;
      frames?: GrafanaFrame[];
    }
  >;
};

type GrafanaFrame = {
  schema?: {
    fields?: Array<{
      name?: string;
    }>;
  };
  data?: {
    values?: unknown[][];
  };
};

const trace = (...args: unknown[]) =>
  console.error('-- ymax-upgrade-run-logs:', ...args);

const LOG_CLUSTER = 'instagoric';
const LOG_CONTAINER = 'log-slog';
const GRAFANA_URL = 'https://monitor.agoric.net';
const DATASOURCE_UID = 'P470A85C5170C7A1D';
const PROJECT_ID = 'simulationlab';

const must = <T>(specimen: T | null | undefined, detail: string): T => {
  if (specimen === null || specimen === undefined) {
    throw Error(detail);
  }
  return specimen;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  trace(init?.method || 'GET', url);
  const response = await fetch(url, init);
  if (!response.ok) {
    throw Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
};

const quote = (specimen: string) => JSON.stringify(specimen);

const networkConfigUrl = (network: Network) =>
  `https://${network}.agoric.net/network-config`;

const getApiAddr = async (network: Network) => {
  trace(`fetching ${network} network config`);
  const config = await fetchJson<NetworkConfig>(networkConfigUrl(network));
  return must(
    config.apiAddrs?.[0],
    `missing apiAddrs in ${network} network-config`,
  );
};

const txHeight = (tx: Pick<ChainTx, 'height'>) => {
  const height = Number.parseInt(tx.height, 10);
  if (!Number.isFinite(height)) {
    throw Error(`bad height for tx ${JSON.stringify(tx)}`);
  }
  return height;
};

const txTimestampMs = (tx: ChainTx) => {
  const iso = must(tx.timestamp, `missing timestamp for tx ${tx.txhash}`);
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw Error(`bad timestamp for tx ${tx.txhash}: ${iso}`);
  }
  return ms;
};

const deriveRunId = (tx: Pick<ChainTx, 'height' | 'txhash'>) =>
  `bridge-${tx.height}-${tx.txhash}-0`;

const buildLogQuery = ({
  runId,
  cluster,
  namespace,
  container,
  pod,
}: {
  runId: string;
  cluster: string;
  namespace: string;
  container: string;
  pod?: string;
}) =>
  [
    `resource.labels.cluster_name=${quote(cluster)}`,
    `${`resource.labels.namespace_name=${quote(namespace)}`}${pod ? ` resource.labels.pod_name=${quote(pod)}` : ''}`,
    `resource.labels.container_name=${quote(container)}`,
    `jsonPayload.attributes."run.id"=${quote(runId)}`,
    `jsonPayload.body.type=${quote('console')}`,
  ]
    .filter(Boolean)
    .join('\n');

const buildExploreUrl = ({
  grafanaUrl,
  datasourceUid,
  queryText,
  projectId,
}: {
  grafanaUrl: string;
  datasourceUid: string;
  queryText: string;
  projectId: string;
}) => {
  const panes = {
    ymax: {
      datasource: datasourceUid,
      queries: [
        {
          queryText,
          refId: 'A',
          datasource: {
            type: 'googlecloud-logging-datasource',
            uid: datasourceUid,
          },
          projectId,
        },
      ],
      range: { from: 'now-24h', to: 'now' },
    },
  };
  return `${grafanaUrl}/explore?schemaVersion=1&panes=${encodeURIComponent(
    JSON.stringify(panes),
  )}&orgId=1`;
};

const getLatestSenderTx = async ({
  apiAddr,
  sender,
  limit,
  txHash,
}: {
  apiAddr: string;
  sender: string;
  limit: number;
  txHash?: string;
}) => {
  trace(
    txHash
      ? `looking for tx ${txHash.toUpperCase()} among recent txs from ${sender}`
      : `fetching latest ${limit} txs from ${sender}`,
  );
  const params = new URLSearchParams({
    query: `message.sender='${sender}'`,
    order_by: 'ORDER_BY_DESC',
    'pagination.limit': `${limit}`,
  });
  const response = await fetchJson<TxResponse>(
    `${apiAddr}/cosmos/tx/v1beta1/txs?${params}`,
  );
  const txs = [...(response.tx_responses || [])];
  if (txHash) {
    const found = txs.find(tx => tx.txhash === txHash.toUpperCase());
    if (!found) {
      throw Error(`tx hash not found among recent sender txs: ${txHash}`);
    }
    trace(`found requested tx ${found.txhash} at height ${found.height}`);
    return found;
  }
  txs.sort((left, right) => {
    const leftTs = left.timestamp ? Date.parse(left.timestamp) : NaN;
    const rightTs = right.timestamp ? Date.parse(right.timestamp) : NaN;
    if (!Number.isNaN(leftTs) && !Number.isNaN(rightTs)) {
      return rightTs - leftTs;
    }
    return txHeight(right) - txHeight(left);
  });
  const latest = must(txs[0], `no txs found for sender ${sender}`);
  trace(`latest tx is ${latest.txhash} at height ${latest.height}`);
  return latest;
};

const completeTx = async ({
  apiAddr,
  tx,
}: {
  apiAddr: string;
  tx: ChainTx;
}) => {
  if (tx.timestamp) {
    return tx;
  }
  trace(`fetching full tx response for ${tx.txhash}`);
  const response = await fetchJson<SingleTxResponse>(
    `${apiAddr}/cosmos/tx/v1beta1/txs/${tx.txhash}`,
  );
  return must(response.tx_response, `missing tx_response for ${tx.txhash}`);
};

const flattenFrames = (frames: GrafanaFrame[] = []) => {
  const rows: Array<Record<string, unknown>> = [];
  for (const frame of frames) {
    const fields = frame.schema?.fields || [];
    const columns = frame.data?.values || [];
    const rowCount = columns[0]?.length || 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row: Record<string, unknown> = {};
      for (let columnIndex = 0; columnIndex < fields.length; columnIndex += 1) {
        const name = fields[columnIndex]?.name || `field_${columnIndex}`;
        row[name] = columns[columnIndex]?.[rowIndex];
      }
      rows.push(row);
    }
  }
  return rows;
};

const queryGrafana = async ({
  grafanaUrl,
  datasourceUid,
  from,
  to,
  queryText,
  projectId,
}: {
  grafanaUrl: string;
  datasourceUid: string;
  from: string;
  to: string;
  queryText: string;
  projectId: string;
}) =>
  fetchJson<GrafanaResponse>(`${grafanaUrl}/api/ds/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      queries: [
        {
          refId: 'A',
          datasource: {
            type: 'googlecloud-logging-datasource',
            uid: datasourceUid,
          },
          projectId,
          queryText,
          maxDataPoints: 1000,
          intervalMs: 1000,
        },
      ],
    }),
  });

const toIso = (ms: number) => new Date(ms).toISOString();

const defaultPodForNetwork = (network: Network) =>
  network === 'devnet' ? 'validator-0' : undefined;

const main = async (argv = process.argv) => {
  const { values } = parseArgs({ args: argv.slice(2), options });
  if (values.help) {
    console.log(usage);
    return;
  }

  const contract = values.contract;
  if (!isPortfolioContract(contract)) {
    throw Error(`bad --contract: ${contract}`);
  }

  const network = values.network;
  if (network !== 'devnet' && network !== 'main') {
    throw Error(`bad --network: ${network}`);
  }

  const txLimit = Number.parseInt(values['tx-limit'], 10);
  const windowMinutes = Number.parseInt(values['window-minutes'], 10);
  if (!Number.isFinite(txLimit) || txLimit < 1) {
    throw Error(`bad --tx-limit: ${values['tx-limit']}`);
  }
  if (!Number.isFinite(windowMinutes) || windowMinutes < 1) {
    throw Error(`bad --window-minutes: ${values['window-minutes']}`);
  }

  const namespace = values.namespace || network;
  const pod = values.pod || defaultPodForNetwork(network);
  const address = values.address || getControlAddress(contract, network);
  const apiAddr = await getApiAddr(network);
  const tx0 = await getLatestSenderTx({
    apiAddr,
    sender: address,
    limit: txLimit,
    txHash: values['tx-hash'],
  });
  const tx = await completeTx({ apiAddr, tx: tx0 });

  const txTimeMs = txTimestampMs(tx);
  const runId = deriveRunId(tx);
  trace(`derived run id ${runId}`);
  const queryText = buildLogQuery({
    runId,
    cluster: LOG_CLUSTER,
    namespace,
    container: LOG_CONTAINER,
    pod,
  });

  const windowMs = windowMinutes * 60_000;
  const from = toIso(txTimeMs - windowMs);
  const to = toIso(txTimeMs + windowMs);
  trace(`querying Grafana logs from ${from} to ${to}`);
  trace(`Grafana query: ${queryText}`);
  const grafana = await queryGrafana({
    grafanaUrl: GRAFANA_URL,
    datasourceUid: DATASOURCE_UID,
    from,
    to,
    queryText,
    projectId: PROJECT_ID,
  });

  const frames = grafana.results?.A?.frames || [];
  const rows = flattenFrames(frames);
  trace(`Grafana returned ${frames.length} frame(s), ${rows.length} row(s)`);
  const result = {
    network,
    contract,
    address,
    txhash: tx.txhash,
    height: tx.height,
    timestamp: tx.timestamp,
    runId,
    grafanaQuery: queryText,
    exploreUrl: buildExploreUrl({
      grafanaUrl: GRAFANA_URL,
      datasourceUid: DATASOURCE_UID,
      queryText,
      projectId: PROJECT_ID,
    }),
    from,
    to,
    frameCount: frames.length,
    rowCount: rows.length,
    rows: values.raw ? undefined : rows,
    raw: values.raw ? grafana : undefined,
  };

  if (values.pretty) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
