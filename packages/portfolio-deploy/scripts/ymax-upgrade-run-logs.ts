#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file query upgrade run slogs for a ymax control tx
 *
 * Reads the slogs from Cloud Logging (`gcloud logging read`, which needs
 * credentials with roles/logging.viewer on the GCP project), falling back to
 * the Grafana datasource for it. Exits nonzero, saying what each source
 * returned, when no log entries are found.
 */

import { execFile as execFileCb } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { URLSearchParams } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import {
  getControlAddress,
  isPortfolioContract,
} from '@agoric/portfolio-api/src/portfolio-constants.js';
import type { YmaxContractNetwork } from '../src/ymax-release-policy.mjs';

const usage = `Usage:
  packages/portfolio-deploy/scripts/ymax-upgrade-run-logs.ts [options]

Options:
  --contract <ymax0|ymax1>     Contract name (default: ymax0)
  --network <devnet|main>      Network (default: devnet)
  --address <bech32>           Override ymaxControl address
  --tx-hash <hash>             Use a specific tx hash instead of latest sender tx
  --namespace <name>           Kubernetes namespace label (default: network)
  --pod <name>                 Pod name filter (default: validator-primary-0 on devnet)
  --pretty                     Print a single pretty JSON object instead of NDJSON
  --tx-limit <n>               Recent txs to inspect from sender (default: 20)
  --window-minutes <n>         Minutes before/after tx time for log query (default: 15)
  --source <name>              Log source: auto (cloud-logging, then grafana),
                               cloud-logging, or grafana (default: auto)
  --max-entries <n>            Max Cloud Logging entries to read (default: 20000)
  --raw                        With --pretty, include the source's raw response
  --save-txs <n>               Fetch last N txs from control address and save as JSON, then exit
  --help                       Show this help
`;

const options = {
  address: { type: 'string' },
  contract: { type: 'string', default: 'ymax0' },
  help: { type: 'boolean', default: false, short: 'h' },
  'max-entries': { type: 'string', default: '20000' },
  namespace: { type: 'string' },
  network: { type: 'string', default: 'devnet' },
  pod: { type: 'string' },
  pretty: { type: 'boolean', default: false },
  raw: { type: 'boolean', default: false },
  'save-txs': { type: 'string' },
  source: { type: 'string', default: 'auto' },
  'tx-hash': { type: 'string' },
  'tx-limit': { type: 'string', default: '20' },
  'window-minutes': { type: 'string', default: '15' },
} as const;

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
      error?: string;
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

/** A Cloud Logging entry, as `gcloud logging read --format=json` prints it. */
type LogEntry = {
  timestamp?: string;
  jsonPayload?: { message?: unknown } & Record<string, unknown>;
};

/**
 * A log row: its time in epoch milliseconds and its content, the raw slog
 * JSON line. Grafana rows also carry other fields.
 */
type LogRow = { time?: unknown; content?: unknown } & Record<string, unknown>;

const isLogEntry = (specimen: unknown): specimen is LogEntry =>
  typeof specimen === 'object' && specimen !== null;

const LOG_SOURCES = ['cloud-logging', 'grafana'] as const;
type LogSource = (typeof LOG_SOURCES)[number];

const execFile = promisify(execFileCb);

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

const networkConfigUrl = (network: YmaxContractNetwork) =>
  `https://${network}.agoric.net/network-config`;

const getApiAddr = async (network: YmaxContractNetwork) => {
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

const fetchSenderTxs = async (
  apiAddr: string,
  sender: string,
  limit: number,
): Promise<TxResponse['tx_responses']> => {
  const params = new URLSearchParams({
    query: `message.sender='${sender}'`,
    order_by: 'ORDER_BY_DESC',
    'pagination.limit': `${limit}`,
  });
  const response = await fetchJson<TxResponse>(
    `${apiAddr}/cosmos/tx/v1beta1/txs?${params}`,
  );
  return response.tx_responses || [];
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
  const txs = [...((await fetchSenderTxs(apiAddr, sender, limit)) || [])];
  if (txHash) {
    const found = txs.find(tx => tx.txhash === txHash.toUpperCase());
    if (found) {
      trace(`found requested tx ${found.txhash} at height ${found.height}`);
      return found;
    }
    // tx not in sender's list — may have been submitted by a grantee via authz; look up directly by hash
    trace(
      `tx ${txHash.toUpperCase()} not among recent sender txs, fetching directly by hash`,
    );
    const response = await fetchJson<SingleTxResponse>(
      `${apiAddr}/cosmos/tx/v1beta1/txs/${txHash.toUpperCase()}`,
    );
    const direct = must(
      response.tx_response,
      `tx not found by hash: ${txHash}`,
    );
    trace(
      `found requested tx ${direct.txhash} at height ${direct.height} via direct lookup`,
    );
    return direct;
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

/**
 * Convert a Cloud Logging entry to the row shape Grafana produces, whose
 * `content` is the raw slog line (kept as `jsonPayload.message`).
 */
const rowFromLogEntry = (entry: LogEntry): LogRow => {
  const { message, ...fields } = entry.jsonPayload || {};
  return {
    time: entry.timestamp ? Date.parse(entry.timestamp) : undefined,
    content: typeof message === 'string' ? message : JSON.stringify(fields),
  };
};

const queryCloudLogging = async ({
  projectId,
  from,
  to,
  queryText,
  maxEntries,
}: {
  projectId: string;
  from: string;
  to: string;
  queryText: string;
  maxEntries: number;
}) => {
  // An explicit time range also overrides gcloud's default --freshness=1d.
  const filter = [
    queryText,
    `timestamp>=${quote(from)}`,
    `timestamp<=${quote(to)}`,
  ].join('\n');
  const args = [
    ...['logging', 'read', filter],
    ...['--project', projectId],
    ...['--limit', `${maxEntries}`],
    '--format=json',
  ];
  trace('gcloud', ...args.map(arg => (arg === filter ? quote(arg) : arg)));
  const { stdout } = await execFile('gcloud', args, {
    maxBuffer: 1024 * 1024 * 1024,
  });
  const entries: unknown = JSON.parse(stdout.trim() || '[]');
  if (!Array.isArray(entries) || !entries.every(isLogEntry)) {
    throw Error(
      `unexpected gcloud logging read output: ${stdout.slice(0, 200)}`,
    );
  }
  if (entries.length >= maxEntries) {
    trace(`⚠️ read the maximum of ${maxEntries} entries; some may be missing`);
  }
  return {
    raw: entries,
    rows: entries.map(rowFromLogEntry),
  };
};

const queryGrafanaRows = async (params: Parameters<typeof queryGrafana>[0]) => {
  const grafana = await queryGrafana(params);
  const result = grafana.results?.A;
  if (!result) {
    throw Error(`Grafana response has no result: ${JSON.stringify(grafana)}`);
  }
  if (result.error || (result.status !== undefined && result.status >= 400)) {
    throw Error(
      `Grafana query failed with status ${result.status}: ${result.error}`,
    );
  }
  const frames = result.frames || [];
  trace(`Grafana returned ${frames.length} frame(s)`);
  const rows: LogRow[] = flattenFrames(frames);
  return { raw: grafana, rows };
};

const toIso = (ms: number) => new Date(ms).toISOString();

const defaultPodForNetwork = (network: YmaxContractNetwork) =>
  network === 'devnet' ? 'validator-primary-0' : undefined;

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

  const sources: readonly LogSource[] =
    values.source === 'auto'
      ? LOG_SOURCES
      : LOG_SOURCES.filter(source => source === values.source);
  if (sources.length === 0) {
    throw Error(`bad --source: ${values.source}`);
  }

  const maxEntries = Number.parseInt(values['max-entries'], 10);
  if (!Number.isFinite(maxEntries) || maxEntries < 1) {
    throw Error(`bad --max-entries: ${values['max-entries']}`);
  }

  const txLimit = Number.parseInt(values['tx-limit'], 10);
  const windowMinutes = Number.parseInt(values['window-minutes'], 10);
  if (!Number.isFinite(txLimit) || txLimit < 1) {
    throw Error(`bad --tx-limit: ${values['tx-limit']}`);
  }
  if (!Number.isFinite(windowMinutes) || windowMinutes < 1) {
    throw Error(`bad --window-minutes: ${values['window-minutes']}`);
  }

  const namespace =
    values.namespace || { devnet: 'devnet', main: 'followmain' }[network];
  const pod = values.pod || defaultPodForNetwork(network);
  const address = values.address || getControlAddress(contract, network);
  const apiAddr = await getApiAddr(network);

  if (values['save-txs']) {
    const saveCount = Number.parseInt(values['save-txs'], 10);
    if (!Number.isFinite(saveCount) || saveCount < 1) {
      throw Error(`bad --save-txs: ${values['save-txs']}`);
    }
    const txs = (await fetchSenderTxs(apiAddr, address, saveCount)) || [];
    const outPath = `${contract}-${network}-txs.json`;
    await writeFile(outPath, `${JSON.stringify(txs, null, 2)}\n`);
    trace(`saved ${txs.length} tx(s) to ${outPath}`);
    return;
  }

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
  trace(`querying logs from ${from} to ${to}`);
  trace(`log query: ${queryText}`);

  // Use the first source with matching entries. An empty or failed one
  // doesn't mean the logs aren't there, so try the next and report each.
  const outcomes: string[] = [];
  let found: { source: LogSource; raw: unknown; rows: LogRow[] } | undefined;
  for (const source of sources) {
    try {
      const { raw, rows } =
        source === 'cloud-logging'
          ? await queryCloudLogging({
              projectId: PROJECT_ID,
              from,
              to,
              queryText,
              maxEntries,
            })
          : await queryGrafanaRows({
              grafanaUrl: GRAFANA_URL,
              datasourceUid: DATASOURCE_UID,
              from,
              to,
              queryText,
              projectId: PROJECT_ID,
            });
      trace(`${source} returned ${rows.length} row(s)`);
      if (rows.length > 0) {
        found = { source, raw, rows };
        break;
      }
      outcomes.push(`${source}: no matching log entries`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      trace(`${source} failed:`, message);
      outcomes.push(`${source}: ${message}`);
    }
  }
  if (!found) {
    throw Error(
      `no upgrade logs found for run ${runId} (tx ${tx.txhash}) between ${from} and ${to}; ${outcomes.join('; ')}`,
    );
  }
  const { source, rows } = found;

  const result = {
    network,
    contract,
    address,
    txhash: tx.txhash,
    height: tx.height,
    timestamp: tx.timestamp,
    runId,
    source,
    logQuery: queryText,
    exploreUrl: buildExploreUrl({
      grafanaUrl: GRAFANA_URL,
      datasourceUid: DATASOURCE_UID,
      queryText,
      projectId: PROJECT_ID,
    }),
    from,
    to,
    rowCount: rows.length,
    rows: values.raw ? undefined : rows,
    raw: values.raw ? found.raw : undefined,
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
