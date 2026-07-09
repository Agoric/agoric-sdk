#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-disable no-throw-literal */

// use @endo/init/debug so LOCKDOWN_OPTIONS are consistent with tests
import '@endo/init/debug.js';

import {
  fetchNetworkConfig,
  makeSmartWalletKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { MsgExec } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { makeCmdRunner, makeFileRd, makeFileRW } from '@agoric/pola-io';
import { getControlAddress } from '@agoric/portfolio-api/src/portfolio-constants.js';
import type {
  BridgeAction,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import { StargateClient } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { execa } from 'execa';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import {
  makeAgdUnsignedTx,
  parseSignedTxBytes,
} from '../src/ymax-authz-msgs.ts';
import {
  formatJson,
  makeUpgradeRequestBuilder as buildUpgradeRequestBuilder,
  type UnsignedUpgradeArtifact,
} from '../src/ymax-authz-flow.ts';
import {
  bundleIdFromBundleRecord,
  canonicalizePrivateArgs,
  expectedOverridesAssetName,
  requireAsset,
  targetInfo,
  validateExpectedOverridesAsset,
  validateNamedInstallRecord,
  validateNamedPendingUpgradeRecord,
  validateNamedUpgradeRecord,
} from '../src/ymax-release-policy.mjs';

const usage = `Usage:
  ymax-deploy-target.ts phase-pre-upgrade --target <target> --tag <tag> [--branch <branch>]
  ymax-deploy-target.ts phase-upgrade-generate --target <target> --tag <tag>
  ymax-deploy-target.ts phase-upgrade-submit --target <target> --tag <tag>
  ymax-deploy-target.ts phase-upgrade-confirm --target <target> --tag <tag>`;

export type Target = 'ymax0-devnet' | 'ymax0-main' | 'ymax1-main';
type Env = Record<string, string | undefined>;
type FileRd = ReturnType<typeof makeFileRd>;
type FileRW = ReturnType<typeof makeFileRW>;
type AssetRd = {
  exists: () => Promise<boolean>;
  copyTo: (dest: FileRW) => Promise<void>;
  read: () => Promise<Uint8Array>;
  readText: () => Promise<string>;
  readJSON: () => Promise<Record<string, unknown>>;
};
type AssetRW = AssetRd & {
  copyFrom: (src: FileRd | FileRW) => Promise<void>;
  writeText: (text: string) => Promise<void>;
  readOnly: () => AssetRd;
};
type CmdRunner = ReturnType<typeof makeCmdRunner>;
export type BaseRecord = {
  target: Target;
  contract: string;
  network: string;
  chainId: string;
  bundleId: string;
};
export type InstallRecord = BaseRecord & {
  confirmedInBundles: boolean;
};
export type UpgradeRecord = BaseRecord & {
  upgradeTxHash: string;
  upgradeBlockHeight: number;
  upgradeBlockTime: string;
  incarnationNumber: number;
  privateArgsOverridesPath: string;
  healthBlocks: Array<{ height: number; hash: string; time: string }>;
};
export type PendingUpgradeRecord = BaseRecord & {
  releaseTag: string;
  invocationId: string;
  privateArgsOverridesPath: string;
  submitTime: string;
};
export type ReleaseAssetInfo = { name: string };
type ReleaseInfo = { assets: ReleaseAssetInfo[]; url: string };
type UpgradeRequestBuilder = ReturnType<typeof buildUpgradeRequestBuilder>;
type StepTools = {
  cause: unknown;
  target: Target;
  releaseTag: string;
  commit: string;
  deployPackage: ReturnType<typeof makeDeployPackage>;
  distDir: FileRW;
  release: ReleaseRW;
  setTimeout: typeof globalThis.setTimeout;
  now: () => number;
};

/**
 * A protobuf `Any` as the gRPC-gateway renders it in JSON: tagged with its
 * type URL under `@type`. The concrete fields depend on which `@type` it is.
 */
type AnyJson = { '@type': string };

/**
 * Approximate REST/JSON shape of agoric.swingset.MsgWalletSpendAction as
 * surfaced in a decoded Cosmos tx body. Present once `@type` confirms the kind.
 *
 * @see packages/cosmic-proto/proto/agoric/swingset/msgs.proto
 */
type WalletSpendActionMessage = AnyJson & {
  owner: string;
  spend_action: string;
};

type AuthzExecMessage = AnyJson & {
  grantee?: string;
  msgs?: AnyJson[];
};

/**
 * Approximate REST/JSON projection of cosmos.base.abci.v1beta1.TxResponse as
 * returned inside /cosmos/tx/v1beta1/txs and /cosmos/tx/v1beta1/txs/{hash}.
 *
 * This script relies on a decoded `tx.body.messages` shape rather than the raw
 * protobuf `Any` payload modeled by cosmic-proto.
 *
 * @see packages/cosmic-proto/proto/cosmos/tx/v1beta1/service.proto
 * @see packages/cosmic-proto/proto/cosmos/base/abci/v1beta1/abci.proto
 */
type CosmosTxResponse = {
  height: string | bigint;
  txhash: string;
  code: number;
  timestamp: string;
  events: Array<{
    type?: string;
    attributes?: Array<{ key?: string; value?: string }>;
  }>;
  tx?: {
    body?: {
      messages?: AnyJson[];
    };
  };
};

const typedTargetInfo = targetInfo as Record<
  Target,
  { contract: 'ymax0' | 'ymax1'; network: 'devnet' | 'main'; chainId: string }
>;

type Cli =
  | {
      subcommand: 'phase-pre-upgrade';
      target: Target;
      tag: string;
      branch?: string;
    }
  | {
      subcommand:
        | 'phase-upgrade-generate'
        | 'phase-upgrade-submit'
        | 'phase-upgrade-confirm';
      target: Target;
      tag: string;
    };

const parseCli = (argv: string[]): Cli => {
  const [subcommand, ...rest] = argv.slice(2);
  if (!subcommand) {
    throw Error(usage);
  }
  const { values } = parseArgs({
    args: rest,
    options: {
      branch: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      tag: { type: 'string' },
      target: { type: 'string' },
    },
    allowPositionals: true,
  });
  if (values.help) {
    throw Error(usage);
  }
  const tag = requireString(values.tag, 'tag');
  const target = requireString(values.target, 'target') as Target;
  switch (subcommand) {
    case 'phase-pre-upgrade':
      return {
        subcommand,
        target,
        tag,
        branch: typeof values.branch === 'string' ? values.branch : undefined,
      };
    case 'phase-upgrade-generate':
    case 'phase-upgrade-submit':
    case 'phase-upgrade-confirm':
      return { subcommand, target, tag };
    default:
      throw Error(`unknown subcommand: ${subcommand}\n${usage}`);
  }
};

const requireString = (
  specimen: string | boolean | undefined,
  name: string,
): string => {
  if (typeof specimen !== 'string' || !specimen) {
    throw Error(`missing --${name}`);
  }
  return specimen;
};

const flags = (spec: Record<string, string | undefined>) =>
  Object.entries(spec).flatMap(([name, value]) =>
    value === undefined ? [] : [`--${name}`, value],
  );

const getTargetInfo = (target: string) => {
  if (!(target in targetInfo)) {
    throw Error(`unsupported target: ${target}`);
  }
  return typedTargetInfo[target as Target];
};

const writeJson = (
  stdout: Pick<typeof process.stdout, 'write'>,
  specimen: unknown,
) => stdout.write(`${JSON.stringify(specimen, null, 2)}\n`);

const bundleIdFromBundle = async (
  bundleFile: Pick<AssetRd, 'readJSON'> | FileRd,
) => {
  try {
    return bundleIdFromBundleRecord(await bundleFile.readJSON());
  } catch (problem) {
    if (
      problem instanceof Error &&
      problem.message === 'bundle-ymax0.json missing endoZipBase64Sha512'
    ) {
      throw Error(
        `bundle file missing endoZipBase64Sha512: ${bundleFile.toString()}`,
      );
    }
    throw problem;
  }
};

const makeReleaseRW = (
  tag: string,
  { gh, scratchDir }: { gh: CmdRunner; scratchDir: FileRW },
) => {
  const readOnly = () => ({
    get: async ({ reject = true }: { reject?: boolean } = {}) => {
      const { stdout } = await gh.exec(
        ['release', 'view', tag, '--json', 'assets,url'],
        {
          reject,
        } as any,
      );
      return JSON.parse(stdout || '{}') as {
        assets: Array<{ name: string }>;
        url: string;
      };
    },
  });
  return {
    create: async ({
      branch,
      title = tag,
      notes = '',
    }: {
      branch: string;
      title?: string;
      notes?: string;
    }) => {
      await gh.exec(
        [
          'release',
          'create',
          tag,
          '--prerelease',
          ...flags({
            target: branch,
            title,
            notes,
          }),
        ],
        {} as any,
      );
    },
    join: (name: string) => {
      const download = (output: string, opts?: Record<string, unknown>) =>
        gh.exec(
          ['release', 'download', tag, '--pattern', name, '--output', output],
          (opts || {}) as any,
        );
      const asset: AssetRW = {
        exists: async () => {
          const release = await readOnly().get();
          return release.assets.some(item => item.name === name);
        },
        copyTo: async (dest: FileRW) => download(dest.toString()),
        read: async () => {
          const { stdout } = await download('-', { encoding: 'buffer' });
          return stdout as Uint8Array;
        },
        readText: async () => {
          const { stdout } = await download('-');
          return stdout;
        },
        readJSON: async () => JSON.parse(await asset.readText()),
        copyFrom: async (src: FileRd | FileRW) => {
          const assetPath = src.toString();
          await gh.exec(['release', 'upload', tag, `${assetPath}#${name}`], {
            stdio: 'inherit',
          } as any);
        },
        writeText: async text => {
          await scratchDir.mkdir();
          const scratchFile = scratchDir.join(name);
          await scratchFile.writeText(text);
          await asset.copyFrom(scratchFile);
        },
        readOnly: () => ({
          exists: asset.exists,
          copyTo: asset.copyTo,
          read: asset.read,
          readText: asset.readText,
          readJSON: asset.readJSON,
        }),
      };
      return asset;
    },
    readOnly,
  };
};
type ReleaseRW = ReturnType<typeof makeReleaseRW>;
type ReleaseRd = ReturnType<ReleaseRW['readOnly']>;

const findRelease = async (release: ReleaseRd) => {
  const found = await release.get({ reject: false });
  if (found.url) {
    return found;
  }
  throw Error('release does not exist');
};

const createRelease = async (
  release: ReleaseRW,
  tag: string,
  branch: string | undefined,
) => {
  if (!branch) {
    throw Error(`release ${tag} does not exist`);
  }
  await release.create({ branch });
  return release.readOnly().get();
};

const createOverrides = async (
  target: Target,
  privateArgs: string | undefined,
  {
    distDir,
    release,
  }: {
    distDir: FileRW;
    release: ReleaseRW;
  },
) => {
  const text = canonicalizePrivateArgs(privateArgs);
  const assetName = expectedOverridesAssetName(target, privateArgs);
  const assetWr = distDir.join(assetName);
  await assetWr.writeText(text);
  const asset = release.join(assetName);
  if (!(await asset.exists())) {
    await asset.copyFrom(assetWr.readOnly());
  }
  return { assetName, file: assetWr.readOnly() };
};

const makeInstallRecord = async (
  target: Target,
  releaseTag: string,
  commit: string,
  bundleId: string,
  result: {
    txHash: string;
    blockHeight: number;
    blockTime: string;
    bundleId: string;
  },
) => {
  if (result.bundleId !== bundleId) {
    throw Error(`install bundleId mismatch: ${result.bundleId} != ${bundleId}`);
  }
  return {
    target,
    releaseTag,
    commit,
    ...typedTargetInfo[target],
    bundleId,
    installTxHash: result.txHash,
    installBlockHeight: result.blockHeight,
    installBlockTime: result.blockTime,
    confirmedInBundles: true,
  };
};

const makeUpgradeRecord = (
  target: Target,
  bundleId: string,
  result: Pick<
    UpgradeRecord,
    | 'upgradeTxHash'
    | 'upgradeBlockHeight'
    | 'upgradeBlockTime'
    | 'incarnationNumber'
    | 'bundleId'
    | 'healthBlocks'
  >,
  privateArgsPath: string,
): UpgradeRecord => {
  if (result.bundleId !== bundleId) {
    throw Error(`upgrade bundleId mismatch: ${result.bundleId} != ${bundleId}`);
  }
  return {
    target,
    ...typedTargetInfo[target],
    privateArgsOverridesPath: privateArgsPath,
    ...result,
  };
};

const makeInvocationId = (target: Target, submitTime: string) =>
  `upgrade.${target}.${submitTime}`;

const grokCapData = (text: string): unknown => {
  const { body } = JSON.parse(text) as { body?: string };
  if (!body) {
    throw Error('missing capdata body');
  }
  return JSON.parse(body.replace(/^#/, ''));
};

// The main-net API load balancer intermittently truncates large response
// bodies (each ymax upgrade tx is ~57KB, and a page of control-wallet history
// is ~1MB), which surfaces as "Unterminated string in JSON". A truncated body
// fails to parse, so retrying until JSON.parse succeeds yields a complete body
// without having to trust a partial one.
const fetchJsonResilient = async <T>(
  fetchFn: typeof fetch,
  url: string,
  setTimeout: typeof globalThis.setTimeout,
): Promise<T> =>
  retryUntilCondition(
    async () => {
      const response = await fetchFn(url);
      if (!response.ok) throw Error(`HTTP ${response.status} for ${url}`);
      // Parse from text (not response.json()) so a truncated body throws here
      // and is retried rather than escaping as an opaque SyntaxError.
      return JSON.parse(await response.text()) as T;
    },
    () => true,
    `fetch ${url}`,
    // retryIntervalMs doubles as a per-attempt timeout; keep it generous so a
    // slow (~1MB) but successful download isn't abandoned and retried.
    { setTimeout, retryIntervalMs: 15_000, maxRetries: 4, log: () => {} },
  );

const makeCosmosTxApi = (
  apiAddrs: string[],
  {
    fetchFn,
    setTimeout,
  }: {
    fetchFn: typeof fetch;
    setTimeout: typeof globalThis.setTimeout;
  },
) => ({
  txs: async ({ query, orderBy, pagination: { limit } }) => {
    const params = new URLSearchParams({
      query,
      order_by: orderBy,
      'pagination.limit': `${limit}`,
    });
    const [apiAddr] = apiAddrs; // XXX rotate?
    return (
      (
        await fetchJsonResilient<{ tx_responses?: CosmosTxResponse[] }>(
          fetchFn,
          `${apiAddr}/cosmos/tx/v1beta1/txs?${params}`,
          setTimeout,
        )
      ).tx_responses || []
    );
  },
  txByHash: async txhash =>
    (
      await fetchJsonResilient<{ tx_response?: CosmosTxResponse }>(
        fetchFn,
        `${apiAddrs[0]}/cosmos/tx/v1beta1/txs/${txhash}`,
        setTimeout,
      )
    ).tx_response,
  blockByHeight: async (height: number) => {
    type BlockResponse = {
      block_id?: { hash?: string };
      block?: { header?: { height?: string; time?: string } };
    };
    const [apiAddr] = apiAddrs;
    const data = await fetchJsonResilient<BlockResponse>(
      fetchFn,
      `${apiAddr}/cosmos/base/tendermint/v1beta1/blocks/${height}`,
      setTimeout,
    );
    const b64hash = data.block_id?.hash;
    const header = data.block?.header;
    if (!b64hash || !header?.height || !header?.time) {
      throw Error(`incomplete block data at height ${height}`);
    }
    return {
      height: Number.parseInt(header.height, 10),
      hash: Buffer.from(b64hash, 'base64').toString('hex'),
      time: header.time,
    };
  },
});

const makeAgoricVstorageApi = (
  apiAddrs: string[],
  {
    fetchFn,
    setTimeout,
  }: {
    fetchFn: typeof fetch;
    setTimeout: typeof globalThis.setTimeout;
  },
) => ({
  // Attenuate to a single smart wallet's published node, binding the address
  // (designation) to the read authority so callers can't aim it elsewhere.
  wallet: (address: string) => ({
    // Read this wallet's published update history, decoded into smartWallet
    // UpdateRecords oldest-first (returns [] when the node has published
    // nothing yet). vstorage wraps the history in a StreamCell of capData
    // strings (cf. @agoric/client-utils storageHelper); we decode each body
    // with the slot-naive grokCapData since callers only need scalar fields
    // (updated/id/error), not resolved board remotes.
    readUpdates: async (): Promise<UpdateRecord[]> => {
      const { value } = await fetchJsonResilient<{ value?: string }>(
        fetchFn,
        `${apiAddrs[0]}/agoric/vstorage/data/published.wallet.${address}`,
        setTimeout,
      );
      if (!value) return [];
      const { values } = JSON.parse(value) as { values?: string[] };
      return (values || []).flatMap(entry => {
        try {
          return [grokCapData(entry) as UpdateRecord];
        } catch {
          return [];
        }
      });
    },
  }),
});

// Tolerance for clock skew between the deploy host (which stamps submitTime)
// and chain consensus time, when matching an upgrade tx to its submit.
const SUBMIT_TIME_SKEW_MS = 20 * 1_000;

const extractWalletSpendActions = (
  message: AnyJson | undefined,
): WalletSpendActionMessage[] => {
  if (!message) {
    return [];
  }
  if (message['@type'] === MsgWalletSpendAction.typeUrl) {
    return [message as WalletSpendActionMessage];
  }
  if (message['@type'] === MsgExec.typeUrl) {
    const execMessage = message as AuthzExecMessage;
    return (execMessage.msgs || []).flatMap(extractWalletSpendActions);
  }
  return [];
};

const findInvocationTx = ({
  pending,
  owner,
  txs,
}: {
  pending: PendingUpgradeRecord;
  owner: string;
  txs: CosmosTxResponse[];
}) => {
  // submitTime is recorded just before broadcast, so the block timestamp must
  // be no earlier (less a small tolerance for clock skew); this window keeps us
  // from matching a prior submit's upgrade of the same bundle.
  const submitTimeMs = Date.parse(pending.submitTime);
  const minTimeMs = submitTimeMs - SUBMIT_TIME_SKEW_MS;
  // The control wallet stamps each invocation with its own message.id nonce,
  // so we can't correlate on pending.invocationId. Instead identify the
  // upgrade by control wallet + an invokeEntry upgrade of this specific bundle.
  // Returns the upgrade message (for its id) when `message` is this bundle's
  // upgrade invocation, else undefined; doubles as a predicate.
  const bundleUpgrade = (message: AnyJson) => {
    for (const walletMessage of extractWalletSpendActions(message)) {
      if (walletMessage.owner !== owner) {
        continue;
      }
      try {
        const action = grokCapData(walletMessage.spend_action) as BridgeAction;
        if (!(action.method === 'invokeEntry')) continue;
        const msg = action.message;
        if (!(msg.method === 'upgrade')) continue;
        const [{ bundleId }] = msg.args as [{ bundleId: string }];
        if (!(bundleId === pending.bundleId)) continue;
        return msg;
      } catch {
        // Ignore malformed nested messages while scanning recent txs.
      }
    }
    return undefined;
  };
  const tx = txs.find(
    candidate =>
      !(candidate.timestamp && Date.parse(candidate.timestamp) < minTimeMs) &&
      candidate.tx?.body?.messages?.some(bundleUpgrade),
  );
  if (!tx) {
    throw Error(
      `no chain tx found for upgrade of ${pending.bundleId} since ${pending.submitTime}`,
    );
  }
  // The wallet nonce that identifies this invocation's result in vstorage.
  const messageId = tx.tx?.body?.messages
    ?.map(bundleUpgrade)
    .find(msg => msg)?.id;
  return { tx, messageId };
};

const findDetachedAuthzGrantee = async (
  release: ReleaseRW,
  upgradeTarget: Target,
) => {
  for (const name of [
    `${upgradeTarget}-authz-signed-tx.json`,
    `${upgradeTarget}-authz-unsigned-tx.json`,
  ]) {
    const asset = release.join(name).readOnly();
    if (!(await asset.exists())) {
      continue;
    }
    const txJson = (await asset.readJSON()) as {
      body?: { messages?: AnyJson[] };
    };
    const messages = Array.isArray(txJson.body?.messages)
      ? txJson.body.messages
      : [];
    const execMessage = messages.find(
      (message): message is AuthzExecMessage =>
        message?.['@type'] === MsgExec.typeUrl &&
        typeof (message as AuthzExecMessage).grantee === 'string',
    );
    if (execMessage?.grantee) {
      return execMessage.grantee;
    }
  }
  return undefined;
};

type DecodedUpgradeLog = {
  time: number;
  body: {
    level?: string;
    source?: string;
    vatID?: string;
    args?: string[];
  };
  attributes?: Record<string, unknown>;
};

// The normalized text form elides the trace suffix from ----- entries,
// e.g. "----- CCtrl,1 " becomes "----- CCtrl", to keep related lines stable.
const normalizeNormLead = (specimen: string) =>
  specimen.startsWith('-----') ? specimen.replace(/,\d+\s*$/, '') : specimen;

const sortUpgradeLogs = (logs: DecodedUpgradeLog[]) =>
  [...logs].sort((left, right) => {
    const leftKey =
      typeof left.attributes?.['process.uptime'] === 'number'
        ? left.attributes['process.uptime']
        : left.time;
    const rightKey =
      typeof right.attributes?.['process.uptime'] === 'number'
        ? right.attributes['process.uptime']
        : right.time;
    return Number(leftKey) - Number(rightKey);
  });

const decodeUpgradeLogs = (slogsText: string) =>
  slogsText
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as { content: string })
    .map(({ content }) => JSON.parse(content) as DecodedUpgradeLog);

const makeNormText = (sortedLogEntries: DecodedUpgradeLog[]) => {
  const lines = sortedLogEntries.map(({ body }) => {
    const args = [...(body.args || [])];
    if (args[0]) {
      args[0] = normalizeNormLead(args[0]);
    }
    return [
      [body.level, body.source, body.vatID].filter(Boolean).join(': '),
      ...args,
    ]
      .filter(Boolean)
      .join(' ');
  });
  return `${lines.join('\n')}\n`;
};

const findUpgradeIncarnation = ({
  sortedLogEntries,
  contract,
  bundleId,
}: {
  sortedLogEntries: DecodedUpgradeLog[];
  contract: string;
  bundleId: string;
}) => {
  const startIndex = sortedLogEntries.findIndex(({ body }) => {
    const args = body.args || [];
    return (
      args[0]?.startsWith('----- CCtrl') &&
      args[1] === contract &&
      args[2] === 'upgrade' &&
      args[3] === bundleId
    );
  });
  if (startIndex < 0) {
    throw Error(
      `missing matching CCtrl upgrade line for ${contract} ${bundleId}`,
    );
  }
  const startVatID = sortedLogEntries[startIndex].body.vatID;
  const resultLog = sortedLogEntries.slice(startIndex + 1).find(({ body }) => {
    const args = body.args || [];
    return (
      args[0]?.startsWith('----- CCtrl') &&
      args[1] === contract &&
      args[2] === 'upgrade result' &&
      (!startVatID || body.vatID === startVatID)
    );
  });
  if (!resultLog) {
    throw Error(
      `missing matching CCtrl upgrade result for ${contract} ${bundleId}`,
    );
  }
  const match = String(resultLog.body.args?.[3] || '').match(
    /incarnationNumber:\s*(\d+)/,
  );
  if (!match) {
    throw Error(
      `missing incarnationNumber in CCtrl upgrade result for ${contract}`,
    );
  }
  return Number.parseInt(match[1], 10);
};

export const validateUpgradePrecondition = async (
  target: Target,
  bundleId: string,
  assets: ReleaseAssetInfo[],
  recordAsset: AssetRd,
) => {
  const assetNames = new Set(assets.map(({ name }) => name));
  requireAsset(assetNames, `${target}-upgrade.json`);
  validateNamedUpgradeRecord(
    assetNames,
    target,
    bundleId,
    (await recordAsset.readJSON()) as UpgradeRecord,
  );
};

const makeDeployPackage = ({ agoricSdk }: { agoricSdk: FileRW }) => {
  const packageDir = agoricSdk.join('packages/portfolio-deploy');
  return {
    distDir: packageDir.join('dist'),
    bundleFile: agoricSdk.join(
      'packages/portfolio-deploy/dist/bundle-ymax0.json',
    ),
  };
};

const expectMissing = (cause: unknown, message: string) => {
  if (!(cause instanceof Error) || cause.message !== message) {
    throw cause;
  }
};

const hasAsset = (release: ReleaseInfo, name: string) =>
  release.assets.some(asset => asset.name === name);

const requireLocalBundle = async (
  deployPackage: ReturnType<typeof makeDeployPackage>,
) => {
  const localBundle = deployPackage.bundleFile.readOnly();
  try {
    await bundleIdFromBundle(localBundle);
  } catch (problem) {
    throw Error('missing local bundle-ymax0.json', { cause: problem });
  }
  return localBundle;
};

const checkBundle = async (
  target: Target,
  asset: AssetRd,
  release: ReleaseInfo,
  deployPackage: ReturnType<typeof makeDeployPackage>,
) => {
  if (hasAsset(release, 'bundle-ymax0.json')) {
    await bundleIdFromBundle(asset);
    return asset;
  }
  if (target !== 'ymax0-devnet') {
    throw { problem: Error('missing bundle-ymax0.json') };
  }
  const localBundle = await requireLocalBundle(deployPackage).catch(problem => {
    throw { problem };
  });
  throw { localBundle };
};

const recordBundleInstall = async (
  installTarget: Extract<Target, 'ymax0-devnet' | 'ymax0-main'>,
  bundleFile: FileRd | AssetRd,
  {
    asset,
    installBundle,
    cause,
    target,
    releaseTag,
    commit,
    deployPackage,
  }: StepTools & {
    asset: AssetRW;
    installBundle: CmdRunner;
  },
) => {
  expectMissing(
    cause,
    `missing required release asset ${installTarget}-install.json`,
  );
  if (target !== installTarget) {
    throw Error(`missing required release asset ${installTarget}-install.json`);
  }
  const localBundleFile =
    'copyTo' in bundleFile
      ? (await bundleFile.copyTo(deployPackage.bundleFile),
        deployPackage.bundleFile.readOnly())
      : bundleFile;
  const { stdout: resultText } = await installBundle.exec(
    flags({ bundle: localBundleFile.toString() }),
    { stdio: ['ignore', 'pipe', 'inherit'] } as any,
  );
  const result = JSON.parse(resultText) as {
    txHash: string;
    blockHeight: number;
    blockTime: string;
    bundleId: string;
  };
  const record = await makeInstallRecord(
    installTarget,
    releaseTag,
    commit,
    await bundleIdFromBundle(localBundleFile),
    result,
  );
  await asset.writeText(`${JSON.stringify(record, null, 2)}\n`);
  return record;
};

const findInstall = async (
  target: Extract<Target, 'ymax0-devnet' | 'ymax0-main'>,
  asset: AssetRd,
  release: ReleaseInfo,
) => {
  const assetNames = new Set(release.assets.map(({ name }) => name));
  requireAsset(assetNames, `${target}-install.json`);
  const record = (await asset.readJSON()) as InstallRecord;
  validateNamedInstallRecord(assetNames, target, record.bundleId, record);
  return record;
};

const findUpgrade = async (
  target: Target,
  asset: AssetRd,
  release: ReleaseInfo,
  install: InstallRecord,
  currentTarget: Target,
  privateArgs: string | undefined,
) => {
  const assetNames = new Set(release.assets.map(({ name }) => name));
  requireAsset(assetNames, `${target}-upgrade.json`);
  const record = (await asset.readJSON()) as UpgradeRecord;
  validateNamedUpgradeRecord(assetNames, target, install.bundleId, record);
  if (target !== currentTarget) {
    return record;
  }
  validateExpectedOverridesAsset(
    `${target}-upgrade.json`,
    target,
    privateArgs,
    record,
  );
  return record;
};

const findPendingUpgrade = async (
  target: Target,
  asset: AssetRd,
  release: ReleaseInfo,
  bundleId: string,
  privateArgs: string | undefined,
  releaseTag: string,
) => {
  const assetNames = new Set(release.assets.map(({ name }) => name));
  requireAsset(assetNames, `${target}-upgrade-pending.json`);
  const record = (await asset.readJSON()) as PendingUpgradeRecord;
  validateNamedPendingUpgradeRecord(
    assetNames,
    target,
    bundleId,
    record,
    privateArgs,
    releaseTag,
  );
  return record;
};

const submitUpgradeContract = async (
  upgradeTarget: Target,
  install: InstallRecord,
  asset: AssetRW,
  {
    cause,
    target,
    privateArgs,
    releaseTag,
    distDir,
    release,
    walletAdmin,
    now,
  }: StepTools & {
    privateArgs: string | undefined;
    walletAdmin: CmdRunner;
  },
) => {
  const { pending, overrides } = await preparePendingUpgrade(
    upgradeTarget,
    install,
    { asset },
    { cause, target, privateArgs, releaseTag, distDir, release, now },
  );
  const info = getTargetInfo(upgradeTarget);
  const resultFile = distDir.join(`${upgradeTarget}-upgrade-result.json`);
  await walletAdmin.exec(
    [
      './packages/portfolio-deploy/src/ymax-upgrade.ts',
      ...flags({
        contract: info.contract,
        bundle: install.bundleId,
        'invocation-id': pending.invocationId,
        overrides: overrides.file.toString(),
        'result-file': resultFile.toString(),
      }),
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] } as any,
  );
  return pending;
};

const preparePendingUpgrade = async (
  upgradeTarget: Target,
  install: InstallRecord,
  { asset }: { asset?: AssetRW } = {},
  {
    cause,
    target,
    privateArgs,
    releaseTag,
    distDir,
    release,
    now,
  }: Pick<
    StepTools,
    'cause' | 'target' | 'releaseTag' | 'distDir' | 'release' | 'now'
  > & {
    privateArgs: string | undefined;
  },
) => {
  expectMissing(
    cause,
    `missing required release asset ${upgradeTarget}-upgrade-pending.json`,
  );
  if (target !== upgradeTarget) {
    throw Error(
      `missing required release asset ${upgradeTarget}-upgrade-pending.json`,
    );
  }
  const overrides = await createOverrides(upgradeTarget, privateArgs, {
    distDir,
    release,
  });
  const submitTime = new Date(now()).toISOString();
  const invocationId = makeInvocationId(upgradeTarget, submitTime);
  const pending: PendingUpgradeRecord = {
    target: upgradeTarget,
    releaseTag,
    ...typedTargetInfo[upgradeTarget],
    bundleId: install.bundleId,
    privateArgsOverridesPath: overrides.assetName,
    invocationId,
    submitTime,
  };
  if (asset) {
    await asset.writeText(`${JSON.stringify(pending, null, 2)}\n`);
  }
  return { pending, overrides };
};

const shQuote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

const formatAgdSignCommand = ({
  request,
  unsignedTxAssetName,
  signedTxAssetName,
}: {
  request: UnsignedUpgradeArtifact;
  unsignedTxAssetName: string;
  signedTxAssetName: string;
}) => {
  const signerAddress = request.grantee || request.controlAddress;
  return [
    'agd tx sign',
    shQuote(unsignedTxAssetName),
    '--offline',
    '--sign-mode direct',
    '--from',
    shQuote(signerAddress),
    '--account-number',
    String(request.signerData.accountNumber),
    '--sequence',
    String(request.signerData.sequence),
    '--chain-id',
    shQuote(request.signerData.chainId),
    '--overwrite',
    '--output-document',
    shQuote(signedTxAssetName),
  ].join(' ');
};

const generateAuthzOperatorUpgrade = async (
  upgradeTarget: Target,
  install: InstallRecord,
  {
    overrides,
    unsignedTxAsset,
    unsignedTxAssetName,
  }: {
    overrides: { assetName: string; file: FileRd };
    unsignedTxAsset: AssetRW;
    unsignedTxAssetName: string;
  },
  {
    cause,
    target,
    releaseTag,
    now,
    makeUpgradeRequestBuilder,
  }: Pick<StepTools, 'cause' | 'target' | 'releaseTag'> & {
    now: () => number;
    makeUpgradeRequestBuilder: (
      upgradeTarget: Target,
    ) => Promise<UpgradeRequestBuilder>;
  },
) => {
  expectMissing(cause, `missing required release asset ${unsignedTxAssetName}`);
  if (target !== upgradeTarget) {
    throw Error(`missing required release asset ${unsignedTxAssetName}`);
  }
  const submitTime = new Date(now()).toISOString();
  const invocationId = makeInvocationId(upgradeTarget, submitTime);
  const pending: PendingUpgradeRecord = {
    target: upgradeTarget,
    releaseTag,
    ...typedTargetInfo[upgradeTarget],
    bundleId: install.bundleId,
    privateArgsOverridesPath: overrides.assetName,
    invocationId,
    submitTime,
  };

  const upgradeRequestBuilder = await makeUpgradeRequestBuilder(upgradeTarget);
  const request = await upgradeRequestBuilder.generateUpgradeRequest({
    bundleId: install.bundleId,
    invocationId,
    memo: '',
    overrides: JSON.parse(await overrides.file.readText()) as object,
    overridesPath: overrides.assetName,
  });

  await unsignedTxAsset.writeText(
    formatJson(
      makeAgdUnsignedTx({
        bodyBytes: Buffer.from(request.bodyBytesBase64, 'base64'),
        authInfoBytes: Buffer.from(request.authInfoBytesBase64, 'base64'),
      }),
    ),
  );

  return {
    agdSignCommand: formatAgdSignCommand({
      request,
      unsignedTxAssetName,
      signedTxAssetName: detachedSignedTxAssetName(
        upgradeTarget,
        request.grantee,
      ),
    }),
    pending,
    unsignedTxAssetName,
  };
};

const detachedUnsignedTxAssetName = (
  target: Target,
  grantee: string | undefined,
) => `${target}${grantee ? '-authz' : ''}-unsigned-tx.json`;

const detachedSignedTxAssetName = (
  target: Target,
  grantee: string | undefined,
) => `${target}${grantee ? '-authz' : ''}-signed-tx.json`;

const submitAuthzOperatorUpgrade = async (
  upgradeTarget: Target,
  txBytes: Uint8Array,
  {
    connectRpc,
  }: {
    connectRpc: (upgradeTarget: Target) => Promise<StargateClient>;
  },
) => {
  return (await connectRpc(upgradeTarget)).broadcastTx(txBytes);
};

const findUnsignedTx = async (
  name: string,
  asset: AssetRd,
  release: ReleaseInfo,
) => {
  if (!hasAsset(release, name)) {
    throw Error(`missing required release asset ${name}`);
  }
  await asset.readJSON();
  return { unsignedTxAssetName: name };
};

const findSignedTx = async (
  name: string,
  asset: AssetRd,
  release: ReleaseInfo,
) => {
  if (!hasAsset(release, name)) {
    throw Error(`missing required release asset ${name}`);
  }
  return {
    signedTxAssetName: name,
    txBytes: parseSignedTxBytes(await asset.readText()),
  };
};

const confirmUpgradeContract = async (
  upgradeTarget: Target,
  install: InstallRecord,
  pending: PendingUpgradeRecord,
  asset: AssetRW,
  {
    cause,
    target,
    release,
    upgradeLogs,
    makeTxApiForTarget,
    makeVstorageApiForTarget,
    grantee,
  }: StepTools & {
    upgradeLogs: CmdRunner;
    makeTxApiForTarget: (
      upgradeTarget: Target,
    ) => Promise<ReturnType<typeof makeCosmosTxApi>>;
    makeVstorageApiForTarget: (
      upgradeTarget: Target,
    ) => Promise<ReturnType<typeof makeAgoricVstorageApi>>;
    grantee?: string;
  },
) => {
  expectMissing(
    cause,
    `missing required release asset ${upgradeTarget}-upgrade.json`,
  );
  if (target !== upgradeTarget) {
    throw Error(`missing required release asset ${upgradeTarget}-upgrade.json`);
  }
  const txApi = await makeTxApiForTarget(upgradeTarget);
  const vstorageApi = await makeVstorageApiForTarget(upgradeTarget);
  const info = getTargetInfo(upgradeTarget);
  const owner = getControlAddress(
    pending.contract as 'ymax0' | 'ymax1',
    pending.network as 'devnet' | 'main',
  );
  const detachedGrantee =
    grantee || (await findDetachedAuthzGrantee(release, upgradeTarget));
  const candidateSenders = [
    ...new Set([owner, detachedGrantee].filter(Boolean)),
  ];
  const txs = (
    await Promise.all(
      candidateSenders.map(sender =>
        txApi.txs({
          query: `message.sender='${sender}'`,
          orderBy: 'ORDER_BY_DESC',
          pagination: { limit: 50 },
        }),
      ),
    )
  ).flat();
  const { tx: invocationTx, messageId } = findInvocationTx({
    pending,
    owner,
    txs,
  });
  // The list page can be truncated, so resolve the full tx by hash. A landed
  // tx (code 0) only proves delivery; fail fast with the real error if it
  // didn't land, or (below) if the invocation itself threw.
  const tx = (await txApi.txByHash(invocationTx.txhash)) || invocationTx;
  if ((tx.code || 0) !== 0) {
    throw Error(`chain tx ${tx.txhash} failed with code ${tx.code}`);
  }
  if (typeof messageId === 'string') {
    // The wallet publishes each invocation's settlement as an `invocation`
    // update carrying the result or, on failure, the error. Scan newest-first
    // for ours and fail fast if the invocation itself threw (e.g. an
    // interface-guard rejection) despite the tx landing.
    // TODO: this reads vstorage once, racing invocation settlement. A slow
    // invocation hasn't published its update yet, so we silently fall through
    // as success; a slow *failure* then loses its real error here and instead
    // dies later in the getGoodLogs retry with a vague "missing upgrade
    // result". Poll (retryUntilCondition) until the invocation update appears,
    // then check .error — mirroring getGoodLogs / client-utils pollOffer.
    const updates = await vstorageApi.wallet(owner).readUpdates();
    const invocation = [...updates]
      .reverse()
      .find(
        update => update.updated === 'invocation' && update.id === messageId,
      );
    if (invocation?.updated === 'invocation' && invocation.error) {
      throw Error(
        `upgrade invocation ${messageId} failed on chain: ${invocation.error}`,
      );
    }
  }
  const result = {
    bundleId: install.bundleId,
    upgradeTxHash: tx.txhash,
    upgradeBlockHeight: Number.parseInt(`${tx.height}`, 10),
    upgradeBlockTime: tx.timestamp || pending.submitTime,
    healthBlocks: [],
  } satisfies Pick<
    UpgradeRecord,
    | 'upgradeTxHash'
    | 'upgradeBlockHeight'
    | 'upgradeBlockTime'
    | 'bundleId'
    | 'healthBlocks'
  >;

  const slogAssetName = `${upgradeTarget}-upgrade-logs.ndjson`;
  const normLogsAssetName = `${upgradeTarget}-upgrade-logs.norm.txt`;

  const getGoodLogs = async () => {
    const { stdout: slogsText } = await upgradeLogs.exec(
      flags({
        contract: info.contract,
        network: info.network,
        'tx-hash': result.upgradeTxHash,
      }),
      { stdio: ['ignore', 'pipe', 'inherit'] } as any,
    );
    const sortedLogEntries = sortUpgradeLogs(decodeUpgradeLogs(slogsText));

    const incarnationNumber = findUpgradeIncarnation({
      sortedLogEntries,
      contract: info.contract,
      bundleId: install.bundleId,
    });
    return { sortedLogEntries, slogsText, incarnationNumber };
  };

  const { sortedLogEntries, slogsText, incarnationNumber } =
    await retryUntilCondition(getGoodLogs, () => true, 'upgrade logs', {
      setTimeout,
      retryIntervalMs: 20_000,
    });

  await release.join(slogAssetName).writeText(slogsText);
  await release
    .join(normLogsAssetName)
    .writeText(makeNormText(sortedLogEntries));

  const fetchHealthBlock = (height: number) =>
    retryUntilCondition(
      () => txApi.blockByHeight(height),
      () => true,
      `block at height ${height}`,
      { setTimeout, retryIntervalMs: 5_000 },
    );
  const healthBlocks = await Promise.all([
    fetchHealthBlock(result.upgradeBlockHeight + 1),
    fetchHealthBlock(result.upgradeBlockHeight + 2),
  ]);

  const record = await makeUpgradeRecord(
    upgradeTarget,
    install.bundleId,
    {
      ...result,
      incarnationNumber,
      healthBlocks,
    },
    pending.privateArgsOverridesPath,
  );
  await asset.writeText(`${JSON.stringify(record, null, 2)}\n`);
  return record;
};

type GraphNode = {
  deps: Record<string, string>;
  find: (asset: AssetRd, deps: Record<string, unknown>) => Promise<unknown>;
  create: (
    deps: Record<string, unknown>,
    asset?: AssetRW,
    cause?: unknown,
  ) => Promise<unknown>;
};

export const makeGraph = (
  target: Target,
  tag: string,
  branch: string | undefined,
  commit: string,
  privateArgs: string | undefined,
  detached: boolean,
  {
    deployPackage,
    release,
    installBundle,
    upgradeLogs,
    walletAdmin,
    connectTargetRpc,
    makeUpgradeRequestBuilder,
    makeTxApiForTarget,
    makeVstorageApiForTarget,
    setTimeout,
    now,
    grantee,
  }: {
    deployPackage: ReturnType<typeof makeDeployPackage>;
    release: ReleaseRW;
    installBundle: CmdRunner;
    upgradeLogs: CmdRunner;
    walletAdmin: CmdRunner;
    connectTargetRpc: (upgradeTarget: Target) => Promise<StargateClient>;
    makeUpgradeRequestBuilder: (
      upgradeTarget: Target,
    ) => Promise<UpgradeRequestBuilder>;
    makeTxApiForTarget: (
      upgradeTarget: Target,
    ) => Promise<ReturnType<typeof makeCosmosTxApi>>;
    makeVstorageApiForTarget: (
      upgradeTarget: Target,
    ) => Promise<ReturnType<typeof makeAgoricVstorageApi>>;
    setTimeout: typeof globalThis.setTimeout;
    now: () => number;
    grantee?: string;
  },
) => {
  const cache = new Map<string, Promise<unknown>>();

  const devBranch = branch === 'main' ? undefined : branch;
  const detachedTxDeps = (upgradeTarget: Target): Record<string, string> => {
    if (!detached) {
      return {};
    }
    return {
      unsignedTx: detachedUnsignedTxAssetName(upgradeTarget, grantee),
      signedTx: detachedSignedTxAssetName(upgradeTarget, grantee),
    };
  };

  const tools = {
    releaseTag: tag,
    commit,
    target,
    deployPackage,
    distDir: deployPackage.distDir,
    release,
    setTimeout,
    now,
    grantee,
  };

  const nodes: Record<string, GraphNode> = {
    release: {
      deps: {},
      find: () => findRelease(release.readOnly()),
      create: () => createRelease(release, tag, devBranch),
    },

    'bundle-ymax0.json': {
      deps: { release: 'release' },
      find: (asset, { release: relInfo }) =>
        checkBundle(target, asset, relInfo as ReleaseInfo, deployPackage),
      create: async (_deps, asset, cause) => {
        const it = cause as { problem: unknown } | { localBundle: FileRd };
        if ('problem' in it) throw it.problem;
        await asset!.copyFrom(it.localBundle);
        return it.localBundle;
      },
    },

    'ymax0-devnet-install.json': {
      deps: { release: 'release', bundle: 'bundle-ymax0.json' },
      find: (asset, { release: relInfo }) =>
        findInstall('ymax0-devnet', asset, relInfo as ReleaseInfo),
      create: async (_a, asset, cause) =>
        recordBundleInstall(
          'ymax0-devnet',
          await requireLocalBundle(deployPackage),
          {
            asset: asset!,
            installBundle,
            cause,
            ...tools,
          },
        ),
    },
    'ymax0-main-install.json': {
      deps: { release: 'release', bundle: 'bundle-ymax0.json' },
      find: (asset, { release: relInfo }) =>
        findInstall('ymax0-main', asset, relInfo as ReleaseInfo),
      create: ({ bundle }, asset, cause) =>
        recordBundleInstall('ymax0-main', bundle as AssetRd, {
          asset: asset!,
          cause,
          installBundle,
          ...tools,
        }),
    },
    'phase-pre-upgrade:ymax0-devnet': {
      deps: {
        release: 'release',
        bundle: 'bundle-ymax0.json',
        install: 'ymax0-devnet-install.json',
      },
      find: async () => Promise.reject(Error('synthetic')),
      create: async ({ release: ensuredRelease, install }) => ({
        target: 'ymax0-devnet',
        phase: 'pre-upgrade',
        detail: {
          url: (ensuredRelease as ReleaseInfo).url,
          ...(install as InstallRecord),
        },
      }),
    },
    'phase-pre-upgrade:ymax0-main': {
      deps: {
        release: 'release',
        bundle: 'bundle-ymax0.json',
        devnetInstall: 'ymax0-devnet-install.json',
        devnetUpgrade: 'ymax0-devnet-upgrade.json',
        install: 'ymax0-main-install.json',
      },
      find: async () => Promise.reject(Error('synthetic')),
      create: async ({ release: ensuredRelease, install }) => ({
        target: 'ymax0-main',
        phase: 'pre-upgrade',
        detail: {
          url: (ensuredRelease as ReleaseInfo).url,
          ...(install as InstallRecord),
        },
      }),
    },
    'phase-pre-upgrade:ymax1-main': {
      deps: {
        release: 'release',
        bundle: 'bundle-ymax0.json',
        install: 'ymax0-main-install.json',
        upgrade: 'ymax0-main-upgrade.json',
      },
      find: async () => Promise.reject(Error('synthetic')),
      create: async ({ release: ensuredRelease }) => ({
        target: 'ymax1-main',
        phase: 'pre-upgrade',
        detail: {
          url: (ensuredRelease as ReleaseInfo).url,
        },
      }),
    },
    'ymax0-devnet-upgrade.json': {
      deps:
        target === 'ymax0-devnet'
          ? {
              release: 'release',
              install: 'ymax0-devnet-install.json',
              pending: 'ymax0-devnet-upgrade-pending.json',
            }
          : { release: 'release', install: 'ymax0-devnet-install.json' },
      find: (asset, { release: relInfo, install }) =>
        findUpgrade(
          'ymax0-devnet',
          asset,
          relInfo as ReleaseInfo,
          install as InstallRecord,
          target,
          privateArgs,
        ),
      create: ({ install, pending }, asset, cause) =>
        confirmUpgradeContract(
          'ymax0-devnet',
          install as InstallRecord,
          pending as PendingUpgradeRecord,
          asset!,
          {
            cause,
            upgradeLogs,
            makeTxApiForTarget,
            makeVstorageApiForTarget,
            ...tools,
          },
        ),
    },
    'ymax0-devnet-upgrade-pending.json': {
      deps: {
        release: 'release',
        install: 'ymax0-devnet-install.json',
        ...detachedTxDeps('ymax0-devnet'),
      },
      find: (asset, { release: relInfo, install }) =>
        findPendingUpgrade(
          'ymax0-devnet',
          asset,
          relInfo as ReleaseInfo,
          (install as InstallRecord).bundleId,
          privateArgs,
          tag,
        ),
      create: async ({ install, signedTx }, asset, cause) => {
        if (detached) {
          const { pending } = await preparePendingUpgrade(
            'ymax0-devnet',
            install as InstallRecord,
            { asset: asset! },
            { cause, privateArgs, ...tools },
          );
          await submitAuthzOperatorUpgrade(
            'ymax0-devnet',
            (signedTx as { txBytes: Uint8Array }).txBytes,
            { connectRpc: connectTargetRpc },
          );
          return pending;
        }
        return submitUpgradeContract(
          'ymax0-devnet',
          install as InstallRecord,
          asset!,
          {
            cause,
            privateArgs,
            walletAdmin,
            ...tools,
          },
        );
      },
    },
    'ymax0-main-upgrade.json': {
      deps:
        target === 'ymax0-main'
          ? {
              release: 'release',
              devnetInstall: 'ymax0-devnet-install.json',
              devnetUpgrade: 'ymax0-devnet-upgrade.json',
              install: 'ymax0-main-install.json',
              pending: 'ymax0-main-upgrade-pending.json',
            }
          : { release: 'release', install: 'ymax0-main-install.json' },
      find: (asset, { release: relInfo, install }) =>
        findUpgrade(
          'ymax0-main',
          asset,
          relInfo as ReleaseInfo,
          install as InstallRecord,
          target,
          privateArgs,
        ),
      create: ({ install, pending }, asset, cause) =>
        confirmUpgradeContract(
          'ymax0-main',
          install as InstallRecord,
          pending as PendingUpgradeRecord,
          asset!,
          {
            cause,
            upgradeLogs,
            makeTxApiForTarget,
            makeVstorageApiForTarget,
            ...tools,
          },
        ),
    },
    'ymax0-main-upgrade-pending.json': {
      deps: {
        release: 'release',
        devnetInstall: 'ymax0-devnet-install.json',
        devnetUpgrade: 'ymax0-devnet-upgrade.json',
        install: 'ymax0-main-install.json',
        ...detachedTxDeps('ymax0-main'),
      },
      find: (asset, { release: relInfo, install }) =>
        findPendingUpgrade(
          'ymax0-main',
          asset,
          relInfo as ReleaseInfo,
          (install as InstallRecord).bundleId,
          privateArgs,
          tag,
        ),
      create: async ({ install, signedTx }, asset, cause) => {
        if (detached) {
          const { pending } = await preparePendingUpgrade(
            'ymax0-main',
            install as InstallRecord,
            { asset: asset! },
            { cause, privateArgs, ...tools },
          );
          await submitAuthzOperatorUpgrade(
            'ymax0-main',
            (signedTx as { txBytes: Uint8Array }).txBytes,
            { connectRpc: connectTargetRpc },
          );
          return pending;
        }
        return submitUpgradeContract(
          'ymax0-main',
          install as InstallRecord,
          asset!,
          {
            cause,
            privateArgs,
            walletAdmin,
            ...tools,
          },
        );
      },
    },
    'ymax1-main-upgrade.json': {
      deps:
        target === 'ymax1-main'
          ? {
              release: 'release',
              install: 'ymax0-main-install.json',
              priorUpgrade: 'ymax0-main-upgrade.json',
              pending: 'ymax1-main-upgrade-pending.json',
            }
          : { release: 'release', install: 'ymax0-main-install.json' },
      find: (asset, { release: relInfo, install }) =>
        findUpgrade(
          'ymax1-main',
          asset,
          relInfo as ReleaseInfo,
          install as InstallRecord,
          target,
          privateArgs,
        ),
      create: ({ install, pending }, asset, cause) =>
        confirmUpgradeContract(
          'ymax1-main',
          install as InstallRecord,
          pending as PendingUpgradeRecord,
          asset!,
          {
            cause,
            upgradeLogs,
            makeTxApiForTarget,
            makeVstorageApiForTarget,
            ...tools,
          },
        ),
    },
    'ymax1-main-upgrade-pending.json': {
      deps: {
        release: 'release',
        install: 'ymax0-main-install.json',
        priorUpgrade: 'ymax0-main-upgrade.json',
        ...detachedTxDeps('ymax1-main'),
      },
      find: (asset, { release: relInfo, install }) =>
        findPendingUpgrade(
          'ymax1-main',
          asset,
          relInfo as ReleaseInfo,
          (install as InstallRecord).bundleId,
          privateArgs,
          tag,
        ),
      create: async ({ install, signedTx }, asset, cause) => {
        if (detached) {
          const { pending } = await preparePendingUpgrade(
            'ymax1-main',
            install as InstallRecord,
            { asset: asset! },
            { cause, privateArgs, ...tools },
          );
          await submitAuthzOperatorUpgrade(
            'ymax1-main',
            (signedTx as { txBytes: Uint8Array }).txBytes,
            { connectRpc: connectTargetRpc },
          );
          return pending;
        }
        return submitUpgradeContract(
          'ymax1-main',
          install as InstallRecord,
          asset!,
          {
            cause,
            privateArgs,
            walletAdmin,
            ...tools,
          },
        );
      },
    },

    'ymax0-devnet-authz-unsigned-tx.json': {
      deps: {
        release: 'release',
        install: 'ymax0-devnet-install.json',
      },
      find: (asset, { release: relInfo }) =>
        findUnsignedTx(
          'ymax0-devnet-authz-unsigned-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async ({ install }, asset, cause) => {
        if (!grantee) {
          throw Fail`GRANTEE_ADDRESS must be set for phase-upgrade-generate`;
        }
        const overrides = await createOverrides('ymax0-devnet', privateArgs, {
          distDir: deployPackage.distDir,
          release,
        });
        return generateAuthzOperatorUpgrade(
          'ymax0-devnet',
          install as InstallRecord,
          {
            overrides,
            unsignedTxAsset: asset!,
            unsignedTxAssetName: 'ymax0-devnet-authz-unsigned-tx.json',
          },
          {
            cause,
            target,
            releaseTag: tag,
            now,
            makeUpgradeRequestBuilder,
          },
        );
      },
    },
    'ymax0-devnet-authz-signed-tx.json': {
      deps: {
        release: 'release',
      },
      find: (asset, { release: relInfo }) =>
        findSignedTx(
          'ymax0-devnet-authz-signed-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async () => {
        throw Error(
          'missing required release asset ymax0-devnet-authz-signed-tx.json',
        );
      },
    },
    'ymax0-main-authz-unsigned-tx.json': {
      deps: {
        release: 'release',
        devnetInstall: 'ymax0-devnet-install.json',
        devnetUpgrade: 'ymax0-devnet-upgrade.json',
        install: 'ymax0-main-install.json',
      },
      find: (asset, { release: relInfo }) =>
        findUnsignedTx(
          'ymax0-main-authz-unsigned-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async ({ install }, asset, cause) => {
        if (!grantee) {
          throw Fail`GRANTEE_ADDRESS must be set for phase-upgrade-generate`;
        }
        const overrides = await createOverrides('ymax0-main', privateArgs, {
          distDir: deployPackage.distDir,
          release,
        });
        return generateAuthzOperatorUpgrade(
          'ymax0-main',
          install as InstallRecord,
          {
            overrides,
            unsignedTxAsset: asset!,
            unsignedTxAssetName: 'ymax0-main-authz-unsigned-tx.json',
          },
          {
            cause,
            target,
            releaseTag: tag,
            now,
            makeUpgradeRequestBuilder,
          },
        );
      },
    },
    'ymax0-main-authz-signed-tx.json': {
      deps: {
        release: 'release',
      },
      find: (asset, { release: relInfo }) =>
        findSignedTx(
          'ymax0-main-authz-signed-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async () => {
        throw Error(
          'missing required release asset ymax0-main-authz-signed-tx.json',
        );
      },
    },
    'ymax1-main-authz-unsigned-tx.json': {
      deps: {
        release: 'release',
        install: 'ymax0-main-install.json',
        priorUpgrade: 'ymax0-main-upgrade.json',
      },
      find: (asset, { release: relInfo }) =>
        findUnsignedTx(
          'ymax1-main-authz-unsigned-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async ({ install }, asset, cause) => {
        if (!grantee) {
          throw Fail`GRANTEE_ADDRESS must be set for phase-upgrade-generate`;
        }
        const overrides = await createOverrides('ymax1-main', privateArgs, {
          distDir: deployPackage.distDir,
          release,
        });
        return generateAuthzOperatorUpgrade(
          'ymax1-main',
          install as InstallRecord,
          {
            overrides,
            unsignedTxAsset: asset!,
            unsignedTxAssetName: 'ymax1-main-authz-unsigned-tx.json',
          },
          {
            cause,
            target,
            releaseTag: tag,
            now,
            makeUpgradeRequestBuilder,
          },
        );
      },
    },
    'ymax1-main-authz-signed-tx.json': {
      deps: {
        release: 'release',
      },
      find: (asset, { release: relInfo }) =>
        findSignedTx(
          'ymax1-main-authz-signed-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async () => {
        throw Error(
          'missing required release asset ymax1-main-authz-signed-tx.json',
        );
      },
    },
    'ymax0-devnet-unsigned-tx.json': {
      deps: {
        release: 'release',
        install: 'ymax0-devnet-install.json',
      },
      find: (asset, { release: relInfo }) =>
        findUnsignedTx(
          'ymax0-devnet-unsigned-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async ({ install }, asset, cause) => {
        const overrides = await createOverrides('ymax0-devnet', privateArgs, {
          distDir: deployPackage.distDir,
          release,
        });
        return generateAuthzOperatorUpgrade(
          'ymax0-devnet',
          install as InstallRecord,
          {
            overrides,
            unsignedTxAsset: asset!,
            unsignedTxAssetName: 'ymax0-devnet-unsigned-tx.json',
          },
          {
            cause,
            target,
            releaseTag: tag,
            now,
            makeUpgradeRequestBuilder,
          },
        );
      },
    },
    'ymax0-devnet-signed-tx.json': {
      deps: {
        release: 'release',
      },
      find: (asset, { release: relInfo }) =>
        findSignedTx(
          'ymax0-devnet-signed-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async () => {
        throw Error(
          'missing required release asset ymax0-devnet-signed-tx.json',
        );
      },
    },
    'ymax0-main-unsigned-tx.json': {
      deps: {
        release: 'release',
        devnetInstall: 'ymax0-devnet-install.json',
        devnetUpgrade: 'ymax0-devnet-upgrade.json',
        install: 'ymax0-main-install.json',
      },
      find: (asset, { release: relInfo }) =>
        findUnsignedTx(
          'ymax0-main-unsigned-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async ({ install }, asset, cause) => {
        const overrides = await createOverrides('ymax0-main', privateArgs, {
          distDir: deployPackage.distDir,
          release,
        });
        return generateAuthzOperatorUpgrade(
          'ymax0-main',
          install as InstallRecord,
          {
            overrides,
            unsignedTxAsset: asset!,
            unsignedTxAssetName: 'ymax0-main-unsigned-tx.json',
          },
          {
            cause,
            target,
            releaseTag: tag,
            now,
            makeUpgradeRequestBuilder,
          },
        );
      },
    },
    'ymax0-main-signed-tx.json': {
      deps: {
        release: 'release',
      },
      find: (asset, { release: relInfo }) =>
        findSignedTx(
          'ymax0-main-signed-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async () => {
        throw Error('missing required release asset ymax0-main-signed-tx.json');
      },
    },
    'ymax1-main-unsigned-tx.json': {
      deps: {
        release: 'release',
        install: 'ymax0-main-install.json',
        priorUpgrade: 'ymax0-main-upgrade.json',
      },
      find: (asset, { release: relInfo }) =>
        findUnsignedTx(
          'ymax1-main-unsigned-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async ({ install }, asset, cause) => {
        const overrides = await createOverrides('ymax1-main', privateArgs, {
          distDir: deployPackage.distDir,
          release,
        });
        return generateAuthzOperatorUpgrade(
          'ymax1-main',
          install as InstallRecord,
          {
            overrides,
            unsignedTxAsset: asset!,
            unsignedTxAssetName: 'ymax1-main-unsigned-tx.json',
          },
          {
            cause,
            target,
            releaseTag: tag,
            now,
            makeUpgradeRequestBuilder,
          },
        );
      },
    },
    'ymax1-main-signed-tx.json': {
      deps: {
        release: 'release',
      },
      find: (asset, { release: relInfo }) =>
        findSignedTx(
          'ymax1-main-signed-tx.json',
          asset,
          relInfo as ReleaseInfo,
        ),
      create: async () => {
        throw Error('missing required release asset ymax1-main-signed-tx.json');
      },
    },
  };

  const ensureNode = <T>(name: string): Promise<T> => {
    if (!nodes[name]) {
      throw Error(`unknown step: ${name}`);
    }
    if (!cache.has(name)) {
      cache.set(
        name,
        (async () => {
          const deps: Record<string, unknown> = {};
          for (const [localName, depName] of Object.entries(nodes[name].deps)) {
            deps[localName] = await ensureNode(depName);
          }
          const asset = name.endsWith('.json') ? release.join(name) : undefined;
          try {
            return await nodes[name].find(
              (asset?.readOnly() as AssetRd | undefined) ??
                (undefined as never),
              deps,
            );
          } catch (cause) {
            return nodes[name].create(deps, asset, cause);
          }
        })(),
      );
    }
    return cache.get(name) as Promise<T>;
  };

  return { nodes, ensureNode };
};

export const main = async (
  argv = process.argv,
  env: Env = process.env,
  {
    execFile = (cmd, args, opts) =>
      execa({ verbose: 'short' })(cmd, args, opts),
    fs: fsio = fs,
    fsp: fspio = fsp,
    path: pathio = path,
    agoricSdk = makeFileRW('.', {
      fs: fsio,
      fsp: fspio,
      path: { ...pathio, join: pathio.resolve },
    }),
    fetchFn = fetch,
    connectRpc = StargateClient.connect,
    makeWalletKit = makeSmartWalletKit,
    stdout = process.stdout as Pick<typeof process.stdout, 'write'>,
    setTimeout = globalThis.setTimeout,
    now = Date.now,
  } = {},
) => {
  const {
    GITHUB_TOKEN: ghToken,
    AGORIC_NET,
    GRANTEE_ADDRESS,
    GRANTEE_PUBKEY,
    MNEMONIC,
    YMAX_INSTALL_BUNDLE_MNEMONIC,
    PRIVATE_ARGS_OVERRIDES,
  } = env;
  if (!ghToken) {
    throw Error('GITHUB_TOKEN must be set');
  }
  const gh = makeCmdRunner('gh', { execFile }).withEnv({
    GH_TOKEN: ghToken,
  });
  const git = makeCmdRunner('git', { execFile });
  const networkEnv = AGORIC_NET ? { AGORIC_NET } : {};

  const installBundle = makeCmdRunner(
    agoricSdk
      .join('packages/portfolio-deploy/scripts/install-bundle.ts')
      .toString(),
    {
      execFile,
      defaultEnv: { ...networkEnv, YMAX_INSTALL_BUNDLE_MNEMONIC },
    },
  );

  const { GITHUB_TOKEN: _g, ...walletAdminEnv } = env;
  const walletAdmin = makeCmdRunner(
    agoricSdk
      .join('packages/portfolio-deploy/scripts/wallet-admin.ts')
      .toString(),
    { execFile, defaultEnv: walletAdminEnv },
  );
  const upgradeLogs = makeCmdRunner(
    agoricSdk
      .join('packages/portfolio-deploy/scripts/ymax-upgrade-run-logs.ts')
      .toString(),
    { execFile, defaultEnv: walletAdminEnv },
  );
  const deployPackage = makeDeployPackage({ agoricSdk });
  const cli = parseCli(argv);
  const { subcommand, tag, target } = cli;
  const release = makeReleaseRW(tag, {
    gh,
    scratchDir: deployPackage.distDir,
  });
  const commit =
    subcommand === 'phase-pre-upgrade'
      ? (await git.exec(['rev-parse', 'HEAD'])).stdout.trim()
      : '';
  const fetch = fetchFn;
  const connectTargetRpc = async (upgradeTarget: Target) => {
    const { network } = getTargetInfo(upgradeTarget);
    const config = await fetchNetworkConfig(network, { fetch });
    const rpcAddr = config.rpcAddrs?.[0];
    if (!rpcAddr) {
      throw Error(`missing rpcAddr for ${network}`);
    }
    return connectRpc(rpcAddr);
  };
  const makeTxApiForTarget = async (upgradeTarget: Target) => {
    const { network } = getTargetInfo(upgradeTarget);
    const config = await fetchNetworkConfig(network, { fetch });
    const { apiAddrs = [] } = config as typeof config & {
      apiAddrs?: string[];
    };
    if (apiAddrs.length < 1) {
      throw Error(`missing apiAddrs for ${network}`);
    }
    return makeCosmosTxApi(apiAddrs, { fetchFn, setTimeout });
  };
  const makeVstorageApiForTarget = async (upgradeTarget: Target) => {
    const { network } = getTargetInfo(upgradeTarget);
    const config = await fetchNetworkConfig(network, { fetch });
    const { apiAddrs = [] } = config as { apiAddrs?: string[] };
    if (apiAddrs.length < 1) {
      throw Error(`missing apiAddrs for ${network}`);
    }
    return makeAgoricVstorageApi(apiAddrs, { fetchFn, setTimeout });
  };
  const makeUpgradeRequestBuilder = async (upgradeTarget: Target) => {
    const { network, contract } = getTargetInfo(upgradeTarget);
    const config = await fetchNetworkConfig(network, { fetch });
    const rpcAddr = config.rpcAddrs?.[0];
    if (!rpcAddr) {
      throw Error(`missing rpcAddr for ${network}`);
    }
    const walletKit = await makeWalletKit(
      {
        fetch: fetchFn,
        delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
      },
      config,
    );
    return buildUpgradeRequestBuilder({
      contract,
      networkConfig: config,
      grantee: GRANTEE_ADDRESS,
      granteePubkey: GRANTEE_PUBKEY ? JSON.parse(GRANTEE_PUBKEY) : undefined,
      queryClient: await connectRpc(rpcAddr),
      walletKit,
      clock: () => new Date(now()),
    });
  };
  const detached =
    subcommand === 'phase-upgrade-generate' ||
    (subcommand === 'phase-upgrade-submit' && !MNEMONIC);
  const submitWalletAdmin =
    subcommand === 'phase-upgrade-submit'
      ? walletAdmin
      : ({
          ...walletAdmin,
          exec: async () => assert.fail('unauthorized'),
        } as CmdRunner);
  const submitTargetRpc =
    subcommand === 'phase-upgrade-submit'
      ? connectTargetRpc
      : async (_upgradeTarget: Target) => assert.fail('unauthorized');

  const graph = makeGraph(
    target,
    tag,
    subcommand === 'phase-pre-upgrade' ? cli.branch : undefined,
    commit,
    PRIVATE_ARGS_OVERRIDES,
    detached,
    {
      deployPackage,
      release,
      installBundle,
      upgradeLogs,
      walletAdmin: submitWalletAdmin,
      connectTargetRpc: submitTargetRpc,
      makeUpgradeRequestBuilder,
      makeTxApiForTarget,
      makeVstorageApiForTarget,
      setTimeout,
      now,
      grantee: GRANTEE_ADDRESS,
    },
  );

  switch (subcommand) {
    case 'phase-pre-upgrade': {
      writeJson(stdout, await graph.ensureNode(`phase-pre-upgrade:${target}`));
      break;
    }
    case 'phase-upgrade-generate': {
      const record = detachedUnsignedTxAssetName(target, GRANTEE_ADDRESS);
      const generated = await graph.ensureNode<object>(record);
      writeJson(stdout, {
        target,
        phase: 'upgrade-generate',
        record,
        detail: generated,
      });
      break;
    }
    case 'phase-upgrade-submit': {
      const pending = await graph.ensureNode<PendingUpgradeRecord>(
        `${target}-upgrade-pending.json`,
      );
      writeJson(stdout, {
        target,
        phase: 'upgrade-submit',
        record: `${target}-upgrade-pending.json`,
        detail: pending,
      });
      break;
    }
    case 'phase-upgrade-confirm': {
      const upgrade = await graph.ensureNode<UpgradeRecord>(
        `${target}-upgrade.json`,
      );
      writeJson(stdout, {
        target,
        phase: 'upgrade-confirm',
        record: `${target}-upgrade.json`,
        detail: upgrade,
      });
      break;
    }
    default:
      throw Error(`unknown subcommand: ${subcommand}\n${usage}`);
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
