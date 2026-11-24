#! /usr/bin/env -S node --import ts-blank-space/register

/**
 * @file query upgrade run slogs for a ymax control tx
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
  --max-entries <n>            Max Cloud Logging entries to read (default: 20000)
  --raw                        With --pretty, include the raw log entries
  --check-access               Only check that gcloud can read the logs, then exit
  --save-txs <n>               Fetch last N txs from control address and save as JSON, then exit
  --help                       Show this help
`;

const options = {
  address: { type: 'string' },
  'check-access': { type: 'boolean', default: false },
  contract: { type: 'string', default: 'ymax0' },
  help: { type: 'boolean', default: false, short: 'h' },
  'max-entries': { type: 'string', default: '20000' },
  namespace: { type: 'string' },
  network: { type: 'string', default: 'devnet' },
  pod: { type: 'string' },
  pretty: { type: 'boolean', default: false },
  raw: { type: 'boolean', default: false },
  'save-txs': { type: 'string' },
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

/** A Cloud Logging entry, as `gcloud logging read --format=json` prints it. */
type LogEntry = {
  timestamp?: string;
  jsonPayload?: { message?: unknown } & Record<string, unknown>;
};

/**
 * A log row: its time in epoch milliseconds and its content, the raw slog
 * JSON line.
 */
type LogRow = { time?: number; content: string };

const isLogEntry = (specimen: unknown): specimen is LogEntry =>
  typeof specimen === 'object' && specimen !== null;

const execFile = promisify(execFileCb);

const trace = (...args: unknown[]) =>
  console.error('-- ymax-upgrade-run-logs:', ...args);

const LOG_CLUSTER = 'instagoric';
const LOG_CONTAINER = 'log-slog';
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

/** Link to the same query in the Cloud Console's Logs Explorer. */
const buildLogsExplorerUrl = ({
  filter,
  from,
  to,
  projectId,
}: {
  filter: string;
  from: string;
  to: string;
  projectId: string;
}) =>
  `https://console.cloud.google.com/logs/query;query=${encodeURIComponent(
    filter,
  )};timeRange=${encodeURIComponent(`${from}/${to}`)}?project=${projectId}`;

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

/**
 * Convert a Cloud Logging entry to a row whose `content` is the raw slog line
 * (kept as `jsonPayload.message`).
 */
const rowFromLogEntry = (entry: LogEntry): LogRow => {
  const { message, ...fields } = entry.jsonPayload || {};
  return {
    time: entry.timestamp ? Date.parse(entry.timestamp) : undefined,
    content: typeof message === 'string' ? message : JSON.stringify(fields),
  };
};

/** The filter for a log query, limited to a time range. */
const buildTimedFilter = ({
  queryText,
  from,
  to,
}: {
  queryText: string;
  from: string;
  to: string;
}) =>
  [queryText, `timestamp>=${quote(from)}`, `timestamp<=${quote(to)}`].join(
    '\n',
  );

/** Why a gcloud command failed, preferring what gcloud itself said. */
const gcloudFailure = (err: unknown) => {
  if (typeof err === 'object' && err !== null) {
    if ('code' in err && err.code === 'ENOENT') {
      return 'gcloud is not installed, or not on PATH';
    }
    if ('stderr' in err && typeof err.stderr === 'string') {
      const stderr = err.stderr.trim();
      if (stderr) return stderr;
    }
  }
  return err instanceof Error ? err.message : String(err);
};

const getGcloudAccount = async () => {
  await null;
  try {
    const { stdout } = await execFile('gcloud', [
      ...['auth', 'list'],
      '--filter=status:ACTIVE',
      '--format=value(account)',
    ]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Check that gcloud's active credentials can read the project's log entries,
 * by reading at most one recent entry. Throws, saying which account was tried
 * and what gcloud reported, when gcloud is missing, has no usable credentials,
 * or lacks the permission (logging.logEntries.list, e.g. via
 * roles/logging.viewer).
 */
const checkLogAccess = async ({
  projectId,
  cluster,
  container,
}: {
  projectId: string;
  cluster: string;
  container: string;
}) => {
  const filter = [
    `resource.labels.cluster_name=${quote(cluster)}`,
    `resource.labels.container_name=${quote(container)}`,
  ].join('\n');
  const args = [
    ...['logging', 'read', filter],
    ...['--project', projectId],
    ...['--limit', '1'],
    ...['--freshness', '10m'],
    '--format=value(insertId)',
  ];
  trace(`checking that gcloud can read logs of project ${projectId}`);
  await null;
  try {
    await execFile('gcloud', args);
  } catch (err) {
    const account = await getGcloudAccount();
    throw Error(
      `cannot read logs of GCP project ${projectId} with gcloud (${
        account ? `as ${account}` : 'no active account'
      }). The active gcloud account needs roles/logging.viewer on the project. gcloud said: ${gcloudFailure(err)}`,
    );
  }
  trace(`gcloud can read logs of project ${projectId}`);
};

const queryCloudLogging = async ({
  projectId,
  filter,
  maxEntries,
}: {
  projectId: string;
  filter: string;
  maxEntries: number;
}) => {
  const args = [
    ...['logging', 'read', filter],
    ...['--project', projectId],
    ...['--limit', `${maxEntries}`],
    '--format=json',
  ];
  trace('gcloud', ...args.map(arg => (arg === filter ? quote(arg) : arg)));
  await null;
  let stdout: string;
  try {
    ({ stdout } = await execFile('gcloud', args, {
      maxBuffer: 1024 * 1024 * 1024,
    }));
  } catch (err) {
    throw Error(`gcloud logging read failed: ${gcloudFailure(err)}`);
  }
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

  // Fail before doing any work if the logs can't be read at all, so that a
  // missing permission is not mistaken for logs that haven't arrived yet.
  if (values['check-access'] || !values['save-txs']) {
    await checkLogAccess({
      projectId: PROJECT_ID,
      cluster: LOG_CLUSTER,
      container: LOG_CONTAINER,
    });
  }
  if (values['check-access']) {
    return;
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
  // An explicit time range also overrides gcloud's default --freshness=1d.
  const filter = buildTimedFilter({ queryText, from, to });
  trace(`querying logs from ${from} to ${to}`);
  const { raw, rows } = await queryCloudLogging({
    projectId: PROJECT_ID,
    filter,
    maxEntries,
  });
  trace(`Cloud Logging returned ${rows.length} row(s)`);
  if (rows.length === 0) {
    throw Error(
      `no upgrade logs found for run ${runId} (tx ${tx.txhash}) between ${from} and ${to}`,
    );
  }

  const result = {
    network,
    contract,
    address,
    txhash: tx.txhash,
    height: tx.height,
    timestamp: tx.timestamp,
    runId,
    logQuery: queryText,
    logsUrl: buildLogsExplorerUrl({
      filter,
      from,
      to,
      projectId: PROJECT_ID,
    }),
    from,
    to,
    rowCount: rows.length,
    rows: values.raw ? undefined : rows,
    raw: values.raw ? raw : undefined,
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
