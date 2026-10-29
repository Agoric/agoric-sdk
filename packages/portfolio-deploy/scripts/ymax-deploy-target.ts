#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-disable no-throw-literal */

// use @endo/init/debug so LOCKDOWN_OPTIONS are consistent with tests
import '@endo/init/debug.js';

import {
  fetchNetworkConfig,
  makeSmartWalletKit,
  retryUntilCondition,
  type MinimalNetworkConfig,
} from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { MsgExec } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { LegacyAminoPubKey } from '@agoric/cosmic-proto/codegen/cosmos/crypto/multisig/keys.js';
import { AuthInfo } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import type { ClusterName } from '@agoric/internal';
import {
  fromTypedEntries,
  provideLazyMap,
  typedEntries,
} from '@agoric/internal/src/js-utils.js';
import { makeCmdRunner, makeFileRd, makeFileRW } from '@agoric/pola-io';
import type { ChainTokenMetadata } from '@agoric/portfolio-api';
import { getControlAddress } from '@agoric/portfolio-api/src/portfolio-constants.js';
import type {
  BridgeAction,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import { pubkeyToAddress } from '@cosmjs/amino';
import { decodePubkey } from '@cosmjs/proto-signing';
import { StargateClient } from '@cosmjs/stargate';
import { Fail, b, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';
import { execa } from 'execa';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { PortfolioDeployConfig } from '../src/portfolio-start.core.js';
import { updateConfigFromYds } from '../src/token-meta.js';
import {
  encodeAuthInfoBytes,
  encodeJsonPublicKey,
  encodeTxBodyBytes,
  makeAgdUnsignedTx,
  parseSignedTxBytes,
} from '../src/ymax-authz-msgs.ts';
import {
  combineDetachedGranteeSignatures,
  formatJson,
  makeUpgradeRequestBuilder as buildUpgradeRequestBuilder,
  resolveGranteeAddress,
  type CombineSignaturesResult,
  type UnsignedUpgradeArtifact,
} from '../src/ymax-authz-flow.ts';
import {
  bundleIdFromBundleRecord,
  canonicalizePrivateArgs,
  digestJson,
  extractOverridesDiscriminator,
  isPrivateArgsSpecified,
  overridesAssetPrefix,
  previousPrivateArgsAssetPrefix,
  privateArgsAssetPrefix,
  requireAsset,
  targetInfo,
  validateExpectedOverridesAsset,
  validateNamedInstallRecord,
  validateNamedPendingUpgradeRecord,
  validateNamedUpgradeRecord,
  type Target,
  type TargetInfo,
} from '../src/ymax-release-policy.mjs';

const usage = `Usage:
  ymax-deploy-target.ts phase-pre-upgrade --target <target> --tag <tag> [--branch <branch>]
  ymax-deploy-target.ts phase-upgrade-args --target <target> --tag <tag>
  ymax-deploy-target.ts phase-upgrade-generate --target <target> --tag <tag>
  ymax-deploy-target.ts phase-upgrade-submit --target <target> --tag <tag>
  ymax-deploy-target.ts phase-upgrade-confirm --target <target> --tag <tag>`;

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
type BundleEvidence = {
  bundleFile: AssetRd | FileRd;
  bundleId: string;
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
type PrivateArgsInfo = {
  releaseUrl: string;
  allegedPrivateArgs: Record<string, any>;
};
type ReleaseInfo = { assets: ReleaseAssetInfo[]; url: string };
type UpgradeRequestBuilder = ReturnType<typeof buildUpgradeRequestBuilder>;
/** https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-a-notice-message */
type Annotater = ((title: string, message: string) => void) &
  ((message: string) => void);
type Logger = {
  info: Annotater;
  warn: Annotater;
  error: Annotater;
};
type StepTools = {
  cause: unknown;
  target: Target;
  releaseTag: string;
  commit: string;
  deployPackage: ReturnType<typeof makeDeployPackage>;
  distDir: FileRW;
  release: ReleaseRW;
  fetchReleaseByAsset: (
    assetName: string,
  ) => Promise<
    { ref: ReleaseRW; info: Awaited<ReturnType<ReleaseRd['get']>> } | undefined
  >;
  /** Resolves to `undefined` when the target has no reliable YDS source. */
  fetchChainMetadata: () => Promise<ChainTokenMetadata | undefined>;
  diff: CmdRunner;
  logger?: Logger;
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

/** https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-a-notice-message */
const makeAnnotationLogger = (
  writer: Pick<typeof process.stderr, 'write'>,
): Logger => {
  const annotatedWrite = (
    level: 'notice' | 'warning' | 'error',
    args: string[],
  ) => {
    if (args.length === 2) {
      const [title, message] = args;
      if (title.match(/[:\\\r\n]/)) {
        throw Error('annotation title must not contain special characters');
      }
      writer.write(`::${level} title=${title}::${message}\n`);
    } else if (args.length === 1) {
      writer.write(`::${level}::${args[0]}\n`);
    } else {
      throw Error(`invalid argument count ${args.length}`);
    }
  };
  return {
    info: (...args) => annotatedWrite('notice', args),
    warn: (...args) => annotatedWrite('warning', args),
    error: (...args) => annotatedWrite('error', args),
  };
};

type Cli =
  | {
      subcommand: 'phase-pre-upgrade';
      target: Target;
      tag: string;
      branch?: string;
    }
  | {
      subcommand:
        | 'phase-upgrade-args'
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
    case 'phase-upgrade-args':
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

const getTargetInfo = (target: Target) => {
  Object.hasOwn(targetInfo, target) || Fail`unsupported target: ${q(target)}`;
  return targetInfo[target];
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

const makeBundleEvidence = async (
  bundleFile: AssetRd | FileRd,
): Promise<BundleEvidence> => ({
  bundleFile,
  bundleId: await bundleIdFromBundle(bundleFile),
});

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

/**
 * At most one `${target}-privateArgsOverrides-*.json` release asset should ever
 * exist per release: without this guard, a retry that omits
 * `privateArgs` (e.g. a rerun of a still-detached-signing wait that forgot
 * to re-supply the workflow's `privateArgsOverrides` input) would compute
 * the digest for `{}` and silently add a second, unrelated asset
 * alongside the real one instead of failing loudly or reusing it.
 */
const provideArgsFiles = async (
  target: Target,
  overridesText: string | undefined,
  {
    distDir,
    release,
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
  }: Pick<
    StepTools,
    | 'distDir'
    | 'release'
    | 'fetchReleaseByAsset'
    | 'fetchChainMetadata'
    | 'diff'
    | 'logger'
  >,
) => {
  // Fingerprint *before* injecting a `chainMetadata` default.
  const prefix = overridesAssetPrefix(target);
  const discriminator = digestJson(overridesText);
  const assetName = `${prefix}${discriminator}.json`;

  // Prefer overrides from a compatible existing release asset.
  const { assets, url: releaseUrl } = await release.readOnly().get();
  const existingOverrides = assets
    .map(({ name }) => name)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'));
  existingOverrides.length <= 1 ||
    Fail`multiple ${q(`${prefix}*.json`)} assets exist for ${b(target)} (${q(existingOverrides)}); remove the stale ones (e.g. \`gh release delete-asset\`)`;
  if (existingOverrides.length > 0) {
    const existingAssetName = existingOverrides[0];
    !isPrivateArgsSpecified(overridesText) ||
      assetName === existingAssetName ||
      Fail`${q(assetName)} would be a new privateArgsOverrides release asset for ${b(target)}, but ${q(existingAssetName)} already exists on the release; remove it (e.g. \`gh release delete-asset\`) or pass the matching privateArgsOverrides`;
    const assetFile = distDir.join(existingAssetName);
    await release.join(existingAssetName).copyTo(assetFile);
    return { assetName: existingAssetName, file: assetFile.readOnly() };
  }

  // Inject a `chainMetadata` default from fresh YDS data, if available.
  // Otherwise the builder falls back to its built-in defaults.
  let overridesJson = overridesText;
  const overrides = overridesJson ? JSON.parse(overridesJson) : {};
  if (!overrides.chainMetadata) {
    const chainMetadata = await fetchChainMetadata();
    if (chainMetadata) {
      overrides.chainMetadata = chainMetadata;
      overridesJson = JSON.stringify(overrides);
    }
  }

  // A ${target}-upgrade.json release asset indicates upgrade completion.
  const prevRelease = await fetchReleaseByAsset(`${target}-upgrade.json`);
  if (!prevRelease) {
    logger?.warn(
      `could not find previous release containing ${target}-upgrade.json`,
    );
  } else {
    logger?.info('previous release', prevRelease.info.url);
  }
  const prevPrivateArgsFile = await (async () => {
    if (!prevRelease) return undefined;
    const prevAssetNames = prevRelease.info.assets.map(({ name }) => name);
    const prevPrivateArgsOverrides = prevAssetNames.filter(
      name => name.startsWith(prefix) && name.endsWith('.json'),
    );
    prevPrivateArgsOverrides.length === 1 ||
      Fail`could not find previous privateArgsOverrides ${q(`${prefix}*.json`)} in ${q(prevAssetNames)}`;
    const prevDiscriminator = extractOverridesDiscriminator(
      target,
      prevPrivateArgsOverrides[0],
    );
    const prevPrivateArgsName = `${privateArgsAssetPrefix(target)}${prevDiscriminator}.json`;
    const matches = prevAssetNames.filter(name => name === prevPrivateArgsName);
    if (matches.length === 0) {
      logger?.warn(
        `could not find alleged previous privateArgs ${q(prevPrivateArgsName)} in ${q(prevAssetNames)}`,
      );
      return undefined;
    }
    matches.length === 1 ||
      Fail`too many alleged previous privateArgs ${q(prevPrivateArgsName)} in ${q(prevAssetNames)}`;
    const localCopy = distDir.join(
      `${previousPrivateArgsAssetPrefix(target)}${discriminator}.json`,
    );
    await prevRelease.ref.join(matches[0]).copyTo(localCopy);
    return localCopy.readOnly();
  })();
  const prevPrivateArgs =
    await prevPrivateArgsFile?.readJSON<PrivateArgsInfo>();
  const privateArgsInfo: typeof prevPrivateArgs = prevPrivateArgs && {
    releaseUrl,
    allegedPrivateArgs: { ...prevPrivateArgs.allegedPrivateArgs, ...overrides },
  };
  const privateArgsFile =
    privateArgsInfo &&
    distDir.join(`${privateArgsAssetPrefix(target)}${discriminator}.json`);
  await privateArgsFile?.writeText(
    canonicalizePrivateArgs(JSON.stringify(privateArgsInfo)),
  );
  const diffFile =
    privateArgsFile &&
    distDir.join(`${privateArgsAssetPrefix(target)}${discriminator}.diff`);
  const diffResult = await (prevPrivateArgsFile &&
    diff.exec([
      '-u',
      prevPrivateArgsFile.toString(),
      privateArgsFile!.toString(),
    ]));
  const diffText = diffResult?.stdout;
  if (diffText?.trim()) {
    logger?.info(
      'privateArgs changes',
      // https://github.com/actions/toolkit/issues/193
      `diff -u\n${diffText}`.replaceAll('\n', '%0A'),
    );
  }
  await diffFile?.writeText(diffText);

  // Attach the privateArgsOverrides release asset first, then the rest.
  const assetFile = distDir.join(assetName);
  await assetFile.writeText(canonicalizePrivateArgs(overridesJson));
  const asset = release.join(assetName);
  if (!(await asset.exists())) {
    await asset.copyFrom(assetFile.readOnly());
  }
  await Promise.all(
    [
      prevPrivateArgsFile,
      privateArgsFile?.readOnly(),
      diffFile?.readOnly(),
    ].map(async fileRd => {
      if (!fileRd) return;
      const subAsset = release.join(fileRd.basename());
      if (await subAsset.exists()) {
        logger?.warn('release asset already exists', fileRd.basename());
        return;
      }
      await subAsset.copyFrom(fileRd);
    }),
  );
  return { assetName, file: assetFile.readOnly() };
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
    ...targetInfo[target],
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
    ...targetInfo[target],
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

/**
 * Decode a WalletSpendAction's spend_action capData into the upgrade
 * invocation it carries (bundleId + the invocationId nonce stamped in the
 * bridge action's message.id), or undefined if it isn't an `upgrade`
 * invokeEntry call — including if it fails to parse, tolerated since some
 * callers scan arbitrary tx/message history for a match.
 */
const extractUpgradeInvocation = (
  spendAction: string,
): { bundleId: string; invocationId: string } | undefined => {
  try {
    const action = grokCapData(spendAction) as BridgeAction;
    if (action.method !== 'invokeEntry') return undefined;
    const { method, args, id } = action.message;
    if (method !== 'upgrade' || id === undefined) return undefined;
    const [{ bundleId }] = args as [{ bundleId: string }];
    return { bundleId, invocationId: String(id) };
  } catch {
    return undefined;
  }
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
  // Returns the invocation (for its invocationId) when `message` is this
  // bundle's upgrade invocation, else undefined; doubles as a predicate.
  const bundleUpgrade = (message: AnyJson) => {
    for (const walletMessage of extractWalletSpendActions(message)) {
      if (walletMessage.owner !== owner) {
        continue;
      }
      const invocation = extractUpgradeInvocation(walletMessage.spend_action);
      if (invocation?.bundleId === pending.bundleId) {
        return invocation;
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
    .find(invocation => invocation)?.invocationId;
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
    return await makeBundleEvidence(localBundle);
  } catch (problem) {
    throw Error('missing local bundle-ymax0.json', { cause: problem });
  }
};

const checkBundle = async (
  target: Target,
  asset: AssetRd,
  release: ReleaseInfo,
  deployPackage: ReturnType<typeof makeDeployPackage>,
) => {
  if (hasAsset(release, 'bundle-ymax0.json')) {
    return makeBundleEvidence(asset);
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
  bundle: BundleEvidence,
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
  const bundleFile = bundle.bundleFile;
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
  const installedBundleId = await bundleIdFromBundle(localBundleFile);
  const record = await makeInstallRecord(
    installTarget,
    releaseTag,
    commit,
    installedBundleId,
    result,
  );
  await asset.writeText(`${JSON.stringify(record, null, 2)}\n`);
  return record;
};

const findInstall = async (
  target: Extract<Target, 'ymax0-devnet' | 'ymax0-main'>,
  asset: AssetRd,
  release: ReleaseInfo,
  bundle: BundleEvidence,
) => {
  const assetNames = new Set(release.assets.map(({ name }) => name));
  requireAsset(assetNames, `${target}-install.json`);
  const record = (await asset.readJSON()) as InstallRecord;
  validateNamedInstallRecord(assetNames, target, bundle.bundleId, record);
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
  if (target !== currentTarget || !isPrivateArgsSpecified(privateArgs)) {
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
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
    walletAdmin,
    now,
  }: StepTools & { privateArgs: string | undefined; walletAdmin: CmdRunner },
) => {
  const { pending, overrides } = await preparePendingUpgrade(
    upgradeTarget,
    install,
    { asset },
    {
      cause,
      target,
      privateArgs,
      releaseTag,
      distDir,
      release,
      fetchReleaseByAsset,
      fetchChainMetadata,
      diff,
      logger,
      now,
    },
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
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
    now,
  }: Pick<
    StepTools,
    | 'cause'
    | 'target'
    | 'releaseTag'
    | 'distDir'
    | 'release'
    | 'fetchReleaseByAsset'
    | 'fetchChainMetadata'
    | 'diff'
    | 'logger'
    | 'now'
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
  const overrides = await provideArgsFiles(upgradeTarget, privateArgs, {
    distDir,
    release,
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
  });
  const submitTime = new Date(now()).toISOString();
  const invocationId = makeInvocationId(upgradeTarget, submitTime);
  const pending: PendingUpgradeRecord = {
    target: upgradeTarget,
    releaseTag,
    ...targetInfo[upgradeTarget],
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

/**
 * Build the pending-upgrade record for an already-generated detached tx
 * from what it actually contains, instead of manufacturing a fresh
 * invocationId at submit time: the tx (and its invocationId) may have been
 * built well before this run, while cosigners were still collecting
 * signatures, so a freshly generated one here would record an invocationId
 * that doesn't match what's actually going to chain.
 */
const buildDetachedPendingRecord = async (
  upgradeTarget: Target,
  install: InstallRecord,
  {
    cause,
    target,
    privateArgs,
    releaseTag,
    distDir,
    release,
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
    now,
    grantee,
  }: Pick<
    StepTools,
    | 'cause'
    | 'target'
    | 'releaseTag'
    | 'distDir'
    | 'release'
    | 'fetchReleaseByAsset'
    | 'fetchChainMetadata'
    | 'diff'
    | 'logger'
    | 'now'
  > & {
    privateArgs: string | undefined;
    grantee: string | undefined;
  },
): Promise<PendingUpgradeRecord> => {
  expectMissing(
    cause,
    `missing required release asset ${upgradeTarget}-upgrade-pending.json`,
  );
  if (target !== upgradeTarget) {
    throw Error(
      `missing required release asset ${upgradeTarget}-upgrade-pending.json`,
    );
  }
  const unsignedTxAssetName = detachedUnsignedTxAssetName(
    upgradeTarget,
    grantee,
  );
  const unsignedTx = (await release.join(unsignedTxAssetName).readJSON()) as {
    body: { messages: AnyJson[] };
  };
  const invocation = unsignedTx.body.messages
    .flatMap(message => extractWalletSpendActions(message))
    .map(walletMessage => extractUpgradeInvocation(walletMessage.spend_action))
    .find(found => found);
  if (!invocation) {
    throw Error(
      `${unsignedTxAssetName} does not contain an upgrade invocation`,
    );
  }
  if (invocation.bundleId !== install.bundleId) {
    throw Error(
      `${unsignedTxAssetName} upgrades bundleId ${invocation.bundleId}, not ${install.bundleId}`,
    );
  }
  const overrides = await provideArgsFiles(upgradeTarget, privateArgs, {
    distDir,
    release,
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
  });
  const submitTime = new Date(now()).toISOString();
  return {
    target: upgradeTarget,
    releaseTag,
    ...targetInfo[upgradeTarget],
    bundleId: install.bundleId,
    privateArgsOverridesPath: overrides.assetName,
    invocationId: invocation.invocationId,
    submitTime,
  };
};

const shQuote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

/**
 * `agd tx sign` needs a different command depending on the grantee's
 * account type:
 * - single-key grantee (or the direct control address): sign directly in
 *   one shot; the output is already the complete signed tx.
 * - multisig grantee: each cosigner signs individually with their own key.
 *   `agd` requires the multisig's pubkey in the *local* keyring even for
 *   this (verified empirically: `agd tx sign` without `--multisig` rejects
 *   the individual signer's own address as "not the tx's intended signer",
 *   since the tx's only real signer is the multisig account) — but only
 *   its public key, so the command imports it directly rather than asking
 *   the cosigner to run a separate `agd keys add --multisig=...` step
 *   naming every other cosigner. The local key name is derived from the
 *   grantee's own address (not the target), so the same recurring grantee
 *   reuses one keyring entry across every target/release it signs for,
 *   and a genuinely different grantee never collides with a stale one.
 *
 * Bracketed with `gh release download`/`gh release upload` so the printed
 * command is copy-paste complete: a cosigner shouldn't have to separately
 * know to fetch the unsigned tx off the release first, or to upload their
 * result back to it afterward.
 */
const formatAgdSignCommand = ({
  target,
  releaseTag,
  request,
  unsignedTxAssetName,
  signedTxAssetName,
}: {
  target: Target;
  releaseTag: string;
  request: UnsignedUpgradeArtifact;
  unsignedTxAssetName: string;
  signedTxAssetName: string;
}) => {
  const download = `gh release download ${shQuote(releaseTag)} --pattern ${shQuote(unsignedTxAssetName)} --clobber`;
  const upload = (assetName: string) =>
    `gh release upload ${shQuote(releaseTag)} ${shQuote(assetName)} --clobber`;
  const chainCommands = (commands: string[]) => commands.join(' &&\n  ');
  const authInfo = AuthInfo.decode(
    Buffer.from(request.authInfoBytesBase64, 'base64'),
  );
  const granteePubkey = authInfo.signerInfos[0]?.publicKey;
  if (granteePubkey?.typeUrl === LegacyAminoPubKey.typeUrl) {
    const granteeAddress =
      request.grantee ||
      Fail`multisig grantee sign command requires a resolved grantee address`;
    const multisigName = `ymax-grantee-${granteeAddress.slice(-8)}`;
    const multisigPubkeyJson = JSON.stringify(
      encodeJsonPublicKey(granteePubkey),
    );
    const signatureAssetName = `${detachedSignatureAssetPrefix(target)}<your-name>.json`;
    const importMultisigKey = [
      `test "$(agd keys show ${shQuote(multisigName)} --pubkey 2>/dev/null)" = ${shQuote(multisigPubkeyJson)}`,
      `agd keys add ${shQuote(multisigName)} --pubkey=${shQuote(multisigPubkeyJson)}`,
    ].join(' || ');
    return chainCommands([
      download,
      importMultisigKey,
      [
        'agd tx sign',
        shQuote(unsignedTxAssetName),
        '--offline',
        '--sign-mode amino-json',
        `--multisig=${multisigName}`,
        '--from',
        '<your-key-name>',
        '--account-number',
        String(request.signerData.accountNumber),
        '--sequence',
        String(request.signerData.sequence),
        '--chain-id',
        shQuote(request.signerData.chainId),
        '--overwrite',
        '--output-document',
        shQuote(signatureAssetName),
      ].join(' '),
      upload(signatureAssetName),
    ]);
  }
  const signerAddress = request.grantee || request.controlAddress;
  return chainCommands([
    download,
    [
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
    ].join(' '),
    upload(signedTxAssetName),
  ]);
};

/**
 * The grantee address embedded in an already-generated unsigned tx (via its
 * signer_info public key), or undefined for a plain control-address tx
 * (which embeds no public key at all — see {@link resolveGrantee}'s doc).
 */
const embeddedGranteeAddress = (authInfo: {
  signerInfos: Array<{ publicKey?: { typeUrl: string; value: Uint8Array } }>;
}) => {
  const pubkeyAny = authInfo.signerInfos[0]?.publicKey;
  return pubkeyAny && pubkeyToAddress(decodePubkey(pubkeyAny), 'agoric');
};

/**
 * A rerun that passes a different `--grantee` than the one an
 * already-generated unsigned tx was built for would otherwise proceed
 * silently — showing a sign command for the wrong signer, or combining
 * uploaded signatures against the wrong grantee's multisig. Catch that
 * before it gets confusing, the same way {@link provideArgsFiles} guards
 * against a conflicting `privateArgsOverrides` release asset.
 */
const ensureGranteeMatchesUnsignedTx = async ({
  release,
  unsignedTxAssetName,
  grantee,
}: {
  release: ReleaseRW;
  unsignedTxAssetName: string;
  grantee: string;
}) => {
  const unsignedTx = (await release.join(unsignedTxAssetName).readJSON()) as {
    auth_info: unknown;
  };
  const authInfo = AuthInfo.decode(encodeAuthInfoBytes(unsignedTx.auth_info));
  const existingAddress =
    embeddedGranteeAddress(authInfo) ||
    Fail`existing ${unsignedTxAssetName} was generated without a grantee`;
  const requestedAddress = resolveGranteeAddress(grantee);
  if (existingAddress !== requestedAddress) {
    throw Error(
      `grantee ${grantee} resolves to ${requestedAddress}, but existing ${unsignedTxAssetName} was generated for grantee ${existingAddress}; remove or rename ${unsignedTxAssetName} to change grantee`,
    );
  }
};

/**
 * Rebuild the `agd tx sign`/`agd keys add` command from whatever's already
 * on the release, rather than only ever showing it the run the unsigned tx
 * was first generated: `graph.ensureNode` skips `create()` (and its
 * `agdSignCommand`) once the asset already exists, which otherwise leaves
 * later "still waiting on cosigners" reruns with nothing to show — the
 * literal string `null` where the command used to be. `account_number`
 * isn't encoded in the tx itself, so it's re-fetched live; the signer
 * address comes from this run's grantee/control address, not by decoding
 * the persisted tx (which a preceding {@link ensureGranteeMatchesUnsignedTx}
 * call already confirmed agrees with it, for the grantee case).
 */
const rebuildAgdSignCommand = async ({
  target,
  releaseTag,
  unsignedTxAssetName,
  signedTxAssetName,
  release,
  connectTargetRpc,
  grantee,
}: {
  target: Target;
  releaseTag: string;
  unsignedTxAssetName: string;
  signedTxAssetName: string;
  release: ReleaseRW;
  connectTargetRpc: (upgradeTarget: Target) => Promise<StargateClient>;
  grantee: string | undefined;
}) => {
  const unsignedTx = (await release.join(unsignedTxAssetName).readJSON()) as {
    auth_info: unknown;
  };
  const authInfoBytes = encodeAuthInfoBytes(unsignedTx.auth_info);
  const authInfo = AuthInfo.decode(authInfoBytes);
  const signerInfo =
    authInfo.signerInfos[0] || Fail`unsigned tx missing signer_info`;
  const { contract, network, chainId } = getTargetInfo(target);
  const signerAddress = grantee
    ? resolveGranteeAddress(grantee)
    : getControlAddress(contract, network);
  const queryClient = await connectTargetRpc(target);
  const account =
    (await queryClient.getAccount(signerAddress)) ||
    Fail`signer ${signerAddress} not found on chain`;
  return formatAgdSignCommand({
    target,
    releaseTag,
    request: {
      authInfoBytesBase64: Buffer.from(authInfoBytes).toString('base64'),
      grantee: grantee ? signerAddress : undefined,
      controlAddress: grantee ? '' : signerAddress,
      signerData: {
        accountNumber: account.accountNumber,
        sequence: Number(signerInfo.sequence),
        chainId,
      },
    } as unknown as UnsignedUpgradeArtifact,
    unsignedTxAssetName,
    signedTxAssetName,
  });
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
    ...targetInfo[upgradeTarget],
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
      target: upgradeTarget,
      releaseTag,
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

/**
 * Individual detached-grantee signature files an operator uploads instead
 * of collecting and combining them into `signedTxAssetName` themselves
 * (see {@link combineDetachedGranteeSignatures}). Only meaningful for authz
 * grantees, since the control address is never a multisig in this design.
 */
const detachedSignatureAssetPrefix = (target: Target) =>
  `${target}-authz-signature-`;

/**
 * If `signedTxAssetName` isn't already on the release, look for uploaded
 * `${target}-authz-signature-*.json` files and, once enough valid ones for
 * the grantee's multisig are present, combine and upload them as
 * `signedTxAssetName` — so an operator never has to run `agd tx multisign`
 * themselves. Safe to call repeatedly while cosigners are still signing:
 * it only writes the asset once combination actually succeeds.
 */
const tryCombineDetachedSignatures = async ({
  target,
  release,
  unsignedTxAssetName,
  signedTxAssetName,
  connectTargetRpc,
}: {
  target: Target;
  release: ReleaseRW;
  unsignedTxAssetName: string;
  signedTxAssetName: string;
  connectTargetRpc: (upgradeTarget: Target) => Promise<StargateClient>;
}): Promise<CombineSignaturesResult> => {
  const { assets } = await release.readOnly().get();
  const prefix = detachedSignatureAssetPrefix(target);
  const signatureAssetNames = assets
    .map(({ name }) => name)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'));
  if (signatureAssetNames.length === 0) {
    return { ready: false, reason: 'no detached signatures uploaded yet' };
  }
  const unsignedTx = await release.join(unsignedTxAssetName).readJSON();
  const signatureDescriptors = await Promise.all(
    signatureAssetNames.map(
      name => release.join(name).readJSON() as Promise<any>,
    ),
  );
  const result = await combineDetachedGranteeSignatures({
    unsignedTx: unsignedTx as any,
    chainId: getTargetInfo(target).chainId,
    getAccountNumber: async (granteeAddress: string) => {
      const queryClient = await connectTargetRpc(target);
      const account =
        (await queryClient.getAccount(granteeAddress)) ||
        Fail`grantee ${granteeAddress} not found on chain`;
      return account.accountNumber;
    },
    signatureDescriptors,
  });
  if (result.ready) {
    await release
      .join(signedTxAssetName)
      .writeText(formatJson(result.signedTx));
  }
  return result;
};

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

type SignedTxRecord = {
  signedTxAssetName: string;
  txBytes: Uint8Array;
  bodyBytes: Uint8Array;
  authInfo: unknown;
};

const findSignedTx = async (
  name: string,
  asset: AssetRd,
  release: ReleaseInfo,
): Promise<SignedTxRecord> => {
  if (!hasAsset(release, name)) {
    throw Error(`missing required release asset ${name}`);
  }
  const text = await asset.readText();
  const specimen = JSON.parse(text) as any;
  if (
    !specimen?.body ||
    !specimen?.auth_info ||
    !Array.isArray(specimen?.signatures)
  ) {
    throw Error('not signed tx JSON');
  }
  return {
    signedTxAssetName: name,
    txBytes: parseSignedTxBytes(text),
    bodyBytes: encodeTxBodyBytes(specimen.body),
    authInfo: specimen.auth_info,
  };
};

const multisigModeShape = M.splitRecord({
  bitarray: M.and(
    // "extra bits stored" might be omitted (it defaults to 0).
    M.splitRecord(
      {},
      { extra_bits_stored: M.number(), extraBitsStored: M.number() },
    ),
    // "elements" is required but has multiple spellings.
    M.or(
      M.splitRecord({ elems: M.string() }),
      M.splitRecord({ elements: M.string() }),
    ),
  ),
  mode_infos: M.arrayOf(
    M.splitRecord({
      // We only support one signing mode.
      single: M.splitRecord({ mode: 'SIGN_MODE_LEGACY_AMINO_JSON' }),
    }),
  ),
});

const multisigPublicKeyShape = M.splitRecord({
  threshold: M.or(M.string(), M.number()),
  public_keys: M.array(),
});

/* eslint-disable no-bitwise -- Count set bits in bytes. */
const popcount = (bytes: Uint8Array): number => {
  let count = 0;
  for (let byte of bytes) {
    while (byte !== 0) {
      byte &= byte - 1;
      count += 1;
    }
  }
  return count;
};
/* eslint-enable no-bitwise */

/**
 * Validate signer selection using the bit length and final-byte layout of the
 * {@link https://github.com/agoric-labs/cosmos-sdk/tree/Agoric/crypto/types/compact_bit_array.go | Cosmos SDK compact bitarray implementation}.
 */
const checkMultisigSelection = (
  multi: any,
  publicKey: any,
  signerIndex: number,
) => {
  const label = `signer_infos[${signerIndex}]`;
  mustMatch(harden(publicKey), multisigPublicKeyShape, `${label}.public_key`);
  mustMatch(harden(multi), multisigModeShape, `${label}.mode_info.multi`);
  const members = publicKey.public_keys;
  const threshold = Number(publicKey.threshold);
  const { bitarray, mode_infos: modeInfos } = multi;
  const encoded = bitarray.elems ?? bitarray.elements;
  const bytes = Buffer.from(encoded, 'base64');
  // `extra` indicates the count of bits to take from an incomplete final octet.
  const extra = bitarray.extra_bits_stored ?? bitarray.extraBitsStored ?? 0;
  const bitLength =
    extra === 0 ? bytes.length * 8 : (bytes.length - 1) * 8 + extra;

  const fail = (strings: TemplateStringsArray, ...subs: unknown[]) => {
    const prefixedStrings = [
      `${label}: invalid multisig signer selection: ${strings[0]}`,
      ...strings.slice(1),
    ];
    throw Fail(prefixedStrings, ...subs);
  };

  (Number.isSafeInteger(threshold) &&
    threshold >= 1 &&
    threshold <= members.length) ||
    fail`Number(public_key.threshold) must be a safe integer between 1 and ${members.length} keys; got ${threshold} from input ${publicKey.threshold}`;

  (Number.isSafeInteger(extra) && extra >= 0 && extra <= 8) ||
    fail`(bitarray.extra_bits_stored ?? bitarray.extraBitsStored ?? 0) must be a safe integer between 0 and 8; got ${extra}`;
  bytes.length > 0 ||
    fail`(bitarray.elems ?? bitarray.elements) decodes to no bytes`;
  bytes.toString('base64') === encoded ||
    fail`(bitarray.elems ?? bitarray.elements) is not canonical base64`;
  if (extra !== 0) {
    // The final byte must not set bits beyond those used for `extra`.
    bytes.at(-1)! % 2 ** (8 - extra) === 0 ||
      fail`bitarray has non-zero padding bits in its final byte (0x${b(bytes.at(-1)!.toString(16).padStart(2, '0'))}, extra=${extra} from bitarray.extra_bits_stored ?? bitarray.extraBitsStored ?? 0)`;
  }

  bitLength === members.length ||
    fail`bitarray length ${bitLength} does not match key count ${members.length} (${bytes.length} bytes, extra=${extra} from bitarray.extra_bits_stored ?? bitarray.extraBitsStored ?? 0)`;

  const sigCount = popcount(bytes);
  sigCount >= threshold ||
    fail`bitarray selects ${sigCount} keys, fewer than threshold ${threshold}`;
  modeInfos.length === sigCount ||
    fail`bitarray selects ${sigCount} keys but mode_infos contains ${modeInfos.length}`;
  for (const [index, modeInfo] of modeInfos.entries()) {
    !modeInfo?.multi ||
      fail`mode_infos[${index}] contains an unsupported nested multisig`;
  }
};

export const normalizeSignedAuthInfo = (
  signedAuthInfo: any,
  unsignedAuthInfo: any,
) => {
  const comparableAuthInfo = JSON.parse(JSON.stringify(signedAuthInfo));
  for (const [index, signerInfo] of (
    comparableAuthInfo.signer_infos || []
  ).entries()) {
    const unsignedSignerInfo = unsignedAuthInfo.signer_infos?.[index];
    const unsignedModeInfo = unsignedSignerInfo?.mode_info;
    const signedModeInfo = signerInfo.mode_info;
    const unsignedPublicKey = unsignedSignerInfo?.public_key;
    if (
      unsignedPublicKey?.['@type'] === LegacyAminoPubKey.typeUrl &&
      unsignedModeInfo?.single?.mode === 'SIGN_MODE_DIRECT' &&
      signedModeInfo?.multi
    ) {
      checkMultisigSelection(signedModeInfo.multi, unsignedPublicKey, index);
      signerInfo.mode_info = unsignedModeInfo;
    }
    if (
      unsignedSignerInfo &&
      !('public_key' in unsignedSignerInfo) &&
      'public_key' in signerInfo
    ) {
      delete signerInfo.public_key;
    }
  }
  return comparableAuthInfo;
};

const requireMatchingDetachedSignedTx = async (
  upgradeTarget: Target,
  signedTx: SignedTxRecord,
  {
    release,
    grantee,
  }: {
    release: ReleaseRW;
    grantee: string | undefined;
  },
) => {
  const unsignedTxAssetName = detachedUnsignedTxAssetName(
    upgradeTarget,
    grantee,
  );
  const unsignedTx = (await release.join(unsignedTxAssetName).readJSON()) as {
    body?: unknown;
    auth_info?: unknown;
  };
  if (!unsignedTx.body || !unsignedTx.auth_info) {
    throw Error(`${unsignedTxAssetName} is not unsigned tx JSON`);
  }
  const unsignedBodyBytes = encodeTxBodyBytes(unsignedTx.body);
  const unsignedAuthInfoBytes = encodeAuthInfoBytes(unsignedTx.auth_info);
  if (!Buffer.from(signedTx.bodyBytes).equals(Buffer.from(unsignedBodyBytes))) {
    throw Error(
      `${signedTx.signedTxAssetName} body does not match ${unsignedTxAssetName}`,
    );
  }
  const signedAuthInfoBytes = encodeAuthInfoBytes(
    normalizeSignedAuthInfo(signedTx.authInfo, unsignedTx.auth_info),
  );
  if (
    !Buffer.from(signedAuthInfoBytes).equals(Buffer.from(unsignedAuthInfoBytes))
  ) {
    throw Error(
      `${signedTx.signedTxAssetName} auth_info does not match ${unsignedTxAssetName}`,
    );
  }
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

type MakeGraphPowers = {
  deployPackage: ReturnType<typeof makeDeployPackage>;
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
  grantee?: string;
} & Pick<
  StepTools,
  | 'release'
  | 'fetchReleaseByAsset'
  | 'fetchChainMetadata'
  | 'diff'
  | 'logger'
  | 'now'
  | 'setTimeout'
>;
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
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
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
  }: MakeGraphPowers,
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
    fetchReleaseByAsset,
    fetchChainMetadata,
    diff,
    logger,
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
        const it = (cause ?? {}) as
          | { problem: unknown }
          | { localBundle: BundleEvidence };
        if ('problem' in it) throw it.problem;
        if (!('localBundle' in it)) throw cause;
        await asset!.copyFrom(it.localBundle.bundleFile as FileRd);
        return it.localBundle;
      },
    },

    // ymax0-devnet-install.json, ymax0-main-install.json
    ...fromTypedEntries(
      (['ymax0-devnet', 'ymax0-main'] as const).map(envName => [
        `${envName}-install.json`,
        {
          deps: { release: 'release', bundle: 'bundle-ymax0.json' },
          find: (asset, { release: relInfo, bundle }) =>
            findInstall(
              envName,
              asset,
              relInfo as ReleaseInfo,
              bundle as BundleEvidence,
            ),
          create: async ({ bundle }, asset, cause) =>
            recordBundleInstall(envName, bundle as BundleEvidence, {
              asset: asset!,
              installBundle,
              cause,
              ...tools,
            }),
        },
      ]),
    ),

    // phase-pre-upgrade:ymax0-devnet, phase-pre-upgrade:ymax0-main,
    // phase-pre-upgrade:ymax1-main
    ...fromTypedEntries(
      typedEntries({
        'ymax0-devnet': {
          install: 'ymax0-devnet-install.json',
        },
        'ymax0-main': {
          devnetInstall: 'ymax0-devnet-install.json',
          devnetUpgrade: 'ymax0-devnet-upgrade.json',
          install: 'ymax0-main-install.json',
        },
        'ymax1-main': {
          install: 'ymax0-main-install.json',
          upgrade: 'ymax0-main-upgrade.json',
        },
      }).map(([envName, extraDeps]) => [
        `phase-pre-upgrade:${envName}`,
        {
          deps: {
            release: 'release',
            bundle: 'bundle-ymax0.json',
            ...extraDeps,
          },
          find: async () => Promise.reject(Error('synthetic')),
          create: async ({ release: ensuredRelease, install }) => ({
            target: envName,
            phase: 'pre-upgrade',
            detail: {
              url: (ensuredRelease as ReleaseInfo).url,
              ...(envName !== 'ymax1-main' && (install as InstallRecord)),
            },
          }),
        },
      ]),
    ),

    // phase-upgrade-args:ymax0-devnet, phase-upgrade-args:ymax0-main,
    // phase-upgrade-args:ymax1-main
    // Attaches privateArgsOverrides (and privateArgs/diff vs. the previous
    // release) for review; later phases reuse the recorded overrides.
    ...fromTypedEntries(
      typedEntries({
        'ymax0-devnet': {
          install: 'ymax0-devnet-install.json',
        },
        'ymax0-main': {
          devnetInstall: 'ymax0-devnet-install.json',
          devnetUpgrade: 'ymax0-devnet-upgrade.json',
          install: 'ymax0-main-install.json',
        },
        'ymax1-main': {
          install: 'ymax0-main-install.json',
          priorUpgrade: 'ymax0-main-upgrade.json',
        },
      }).map(([envName, extraDeps]) => [
        `phase-upgrade-args:${envName}`,
        {
          deps: { release: 'release', ...extraDeps },
          find: async () => Promise.reject(Error('synthetic')),
          create: async ({ release: ensuredRelease }) => {
            const { assetName } = await provideArgsFiles(envName, privateArgs, {
              distDir: deployPackage.distDir,
              release,
              fetchReleaseByAsset,
              fetchChainMetadata,
              diff,
              logger,
            });
            return {
              target: envName,
              phase: 'upgrade-args',
              record: assetName,
              detail: { url: (ensuredRelease as ReleaseInfo).url },
            };
          },
        },
      ]),
    ),

    // ymax0-devnet-upgrade.json, ymax0-main-upgrade.json,
    // ymax1-main-upgrade.json,
    ...fromTypedEntries(
      typedEntries({
        'ymax0-devnet': {
          install: 'ymax0-devnet-install.json',
          pending: 'ymax0-devnet-upgrade-pending.json',
        },
        'ymax0-main': {
          devnetInstall: 'ymax0-devnet-install.json',
          devnetUpgrade: 'ymax0-devnet-upgrade.json',
          install: 'ymax0-main-install.json',
          pending: 'ymax0-main-upgrade-pending.json',
        },
        'ymax1-main': {
          install: 'ymax0-main-install.json',
          priorUpgrade: 'ymax0-main-upgrade.json',
          pending: 'ymax1-main-upgrade-pending.json',
        },
      }).map(([envName, extraDeps]) => [
        `${envName}-upgrade.json`,
        {
          deps: {
            release: 'release',
            ...(target === envName && extraDeps),
            install: extraDeps.install,
          },
          find: (asset, { release: relInfo, install }) =>
            findUpgrade(
              envName,
              asset,
              relInfo as ReleaseInfo,
              install as InstallRecord,
              target,
              privateArgs,
            ),
          create: ({ install, pending }, asset, cause) =>
            confirmUpgradeContract(
              envName,
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
      ]),
    ),

    // ymax0-devnet-upgrade-pending.json, ymax0-main-upgrade-pending.json,
    // ymax1-main-upgrade-pending.json,
    ...fromTypedEntries(
      typedEntries({
        'ymax0-devnet': {
          install: 'ymax0-devnet-install.json',
        },
        'ymax0-main': {
          devnetInstall: 'ymax0-devnet-install.json',
          devnetUpgrade: 'ymax0-devnet-upgrade.json',
          install: 'ymax0-main-install.json',
        },
        'ymax1-main': {
          install: 'ymax0-main-install.json',
          priorUpgrade: 'ymax0-main-upgrade.json',
        },
      }).map(([envName, extraDeps]) => [
        `${envName}-upgrade-pending.json`,
        {
          deps: {
            release: 'release',
            ...extraDeps,
            ...detachedTxDeps(envName),
          },
          find: (asset, { release: relInfo, install }) =>
            findPendingUpgrade(
              envName,
              asset,
              relInfo as ReleaseInfo,
              (install as InstallRecord).bundleId,
              privateArgs,
              tag,
            ),
          create: async ({ install, signedTx }, asset, cause) => {
            if (detached) {
              const pending = await buildDetachedPendingRecord(
                envName,
                install as InstallRecord,
                { cause, privateArgs, ...tools },
              );
              await requireMatchingDetachedSignedTx(
                envName,
                signedTx as SignedTxRecord,
                tools,
              );
              await asset!.writeText(`${JSON.stringify(pending, null, 2)}\n`);
              await submitAuthzOperatorUpgrade(
                envName,
                (signedTx as SignedTxRecord).txBytes,
                { connectRpc: connectTargetRpc },
              );
              return pending;
            }
            return submitUpgradeContract(
              envName,
              install as InstallRecord,
              asset!,
              { cause, privateArgs, walletAdmin, ...tools },
            );
          },
        },
      ]),
    ),

    // ymax0-devnet-authz-unsigned-tx.json, ymax0-main-authz-unsigned-tx.json,
    // ymax1-main-authz-unsigned-tx.json
    ...fromTypedEntries(
      typedEntries({
        'ymax0-devnet': {
          install: 'ymax0-devnet-install.json',
        },
        'ymax0-main': {
          devnetInstall: 'ymax0-devnet-install.json',
          devnetUpgrade: 'ymax0-devnet-upgrade.json',
          install: 'ymax0-main-install.json',
        },
        'ymax1-main': {
          install: 'ymax0-main-install.json',
          priorUpgrade: 'ymax0-main-upgrade.json',
        },
      }).map(([envName, extraDeps]) => [
        `${envName}-authz-unsigned-tx.json`,
        {
          deps: { release: 'release', ...extraDeps },
          find: (asset, { release: relInfo }) =>
            findUnsignedTx(
              `${envName}-authz-unsigned-tx.json`,
              asset,
              relInfo as ReleaseInfo,
            ),
          create: async ({ install }, asset, cause) => {
            grantee || Fail`GRANTEE must be set for phase-upgrade-generate`;
            const overrides = await provideArgsFiles(envName, privateArgs, {
              distDir: deployPackage.distDir,
              release,
              fetchReleaseByAsset,
              fetchChainMetadata,
              diff,
              logger,
            });
            return generateAuthzOperatorUpgrade(
              envName,
              install as InstallRecord,
              {
                overrides,
                unsignedTxAsset: asset!,
                unsignedTxAssetName: `${envName}-authz-unsigned-tx.json`,
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
      ]),
    ),

    // ymax0-devnet-authz-signed-tx.json, ymax0-main-authz-signed-tx.json,
    // ymax1-main-authz-signed-tx.json
    ...fromTypedEntries(
      (['ymax0-devnet', 'ymax0-main', 'ymax1-main'] as const).map(envName => [
        `${envName}-authz-signed-tx.json`,
        {
          deps: { release: 'release' },
          find: (asset, { release: relInfo }) =>
            findSignedTx(
              `${envName}-authz-signed-tx.json`,
              asset,
              relInfo as ReleaseInfo,
            ),
          create: async () => {
            throw Error(
              `missing required release asset ${envName}-authz-signed-tx.json`,
            );
          },
        },
      ]),
    ),

    // ymax0-devnet-unsigned-tx.json, ymax0-main-unsigned-tx.json,
    // ymax1-main-unsigned-tx.json
    ...fromTypedEntries(
      typedEntries({
        'ymax0-devnet': {
          install: 'ymax0-devnet-install.json',
        },
        'ymax0-main': {
          devnetInstall: 'ymax0-devnet-install.json',
          devnetUpgrade: 'ymax0-devnet-upgrade.json',
          install: 'ymax0-main-install.json',
        },
        'ymax1-main': {
          install: 'ymax0-main-install.json',
          priorUpgrade: 'ymax0-main-upgrade.json',
        },
      }).map(([envName, extraDeps]) => [
        `${envName}-unsigned-tx.json`,
        {
          deps: { release: 'release', ...extraDeps },
          find: (asset, { release: relInfo }) =>
            findUnsignedTx(
              `${envName}-unsigned-tx.json`,
              asset,
              relInfo as ReleaseInfo,
            ),
          create: async ({ install }, asset, cause) => {
            const overrides = await provideArgsFiles(envName, privateArgs, {
              distDir: deployPackage.distDir,
              release,
              fetchReleaseByAsset,
              fetchChainMetadata,
              diff,
              logger,
            });
            return generateAuthzOperatorUpgrade(
              envName,
              install as InstallRecord,
              {
                overrides,
                unsignedTxAsset: asset!,
                unsignedTxAssetName: `${envName}-unsigned-tx.json`,
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
      ]),
    ),

    // ymax0-devnet-signed-tx.json, ymax0-main-signed-tx.json,
    // ymax1-main-signed-tx.json
    ...fromTypedEntries(
      (['ymax0-devnet', 'ymax0-main', 'ymax1-main'] as const).map(envName => [
        `${envName}-signed-tx.json`,
        {
          deps: { release: 'release' },
          find: (asset, { release: relInfo }) =>
            findSignedTx(
              `${envName}-signed-tx.json`,
              asset,
              relInfo as ReleaseInfo,
            ),
          create: async () => {
            throw Error(
              `missing required release asset ${envName}-signed-tx.json`,
            );
          },
        },
      ]),
    ),
  };

  const ensureNode = <T>(name: string): Promise<T> => {
    const node = nodes[name];
    if (!node) {
      throw Error(`unknown step: ${name}`);
    }
    return provideLazyMap(cache, name, async () => {
      const deps: Record<string, unknown> = {};
      for (const [localName, depName] of Object.entries(node.deps)) {
        deps[localName] = await ensureNode(depName);
      }
      const asset = name.endsWith('.json') ? release.join(name) : undefined;
      try {
        return await node.find(
          (asset?.readOnly() as AssetRd | undefined) ?? (undefined as never),
          deps,
        );
      } catch (cause) {
        return node.create(deps, asset, cause);
      }
    }) as Promise<T>;
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
    stderr = undefined as undefined | Pick<typeof process.stderr, 'write'>,
    setTimeout = globalThis.setTimeout,
    now = Date.now,
  } = {},
) => {
  const { GITHUB_TOKEN: GH_TOKEN, ...walletAdminEnv } = env;
  const {
    AGORIC_NET,
    GRANTEE: grantee,
    MNEMONIC,
    YMAX_INSTALL_BUNDLE_MNEMONIC,
    PRIVATE_ARGS_OVERRIDES,
  } = env;
  if (!GH_TOKEN) {
    throw Error('GITHUB_TOKEN must be set');
  }
  const installationEnv = {
    ...(AGORIC_NET && { AGORIC_NET }),
    YMAX_INSTALL_BUNDLE_MNEMONIC,
  };
  const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));
  const logger = stderr ? makeAnnotationLogger(stderr) : undefined;

  const gh = makeCmdRunner('gh', { execFile }).withEnv({ GH_TOKEN });
  const git = makeCmdRunner('git', { execFile });
  const diff = makeCmdRunner('diff', {
    execFile: async (file, args, opts) => {
      if ('reject' in (opts || {})) return execFile(file, args, opts);
      // Don't reject for exit status 1, which indicates non-identical inputs.
      const result = await execFile(file, args, { ...opts, reject: false });
      const exitCode = result?.exitCode;
      if (exitCode === 0 || exitCode === 1) return result;
      throw result;
    },
  });
  const installBundle = makeCmdRunner(
    `${agoricSdk.join('packages/portfolio-deploy/scripts/install-bundle.ts')}`,
    { execFile, defaultEnv: installationEnv },
  );
  const walletAdmin = makeCmdRunner(
    `${agoricSdk.join('packages/portfolio-deploy/scripts/wallet-admin.ts')}`,
    { execFile, defaultEnv: walletAdminEnv },
  );
  const upgradeLogs = makeCmdRunner(
    `${agoricSdk.join('packages/portfolio-deploy/scripts/ymax-upgrade-run-logs.ts')}`,
    { execFile, defaultEnv: walletAdminEnv },
  );
  const deployPackage = makeDeployPackage({ agoricSdk });
  const cli = parseCli(argv);
  const { subcommand, tag, target } = cli;
  const scratchDir = deployPackage.distDir;
  const release = makeReleaseRW(tag, { gh, scratchDir });
  const fetchReleaseByAsset: MakeGraphPowers['fetchReleaseByAsset'] =
    async assetName => {
      const { stdout: ymaxReleasesJson } = await gh.exec([
        'release',
        'list',
        ...['-L', '100'],
        ...['--json', 'name,tagName,createdAt,publishedAt'],
        ...['--jq', 'map(select(.tagName | startswith("ymax-")))'],
      ]);
      const releases = JSON.parse(ymaxReleasesJson || '[]');
      for (const releaseDesc of releases) {
        const ref = makeReleaseRW(releaseDesc.tagName, { gh, scratchDir });
        const info = await ref.readOnly().get();
        if (info.assets.some(asset => asset.name === assetName)) {
          return { ref, info };
        }
      }
      return undefined;
    };
  const fetchChainMetadata = async () => {
    // YDS doesn't understand devnet (dev0 reports mainnet chains such as
    // eip155:42161), so devnet relies on the builder's testnet defaults.
    const networkData: Record<Target, [ClusterName, string] | undefined> = {
      'ymax0-devnet': undefined,
      'ymax0-main': ['mainnet', 'https://main0.ymax.app'],
      'ymax1-main': ['mainnet', 'https://ymax.app'],
    };
    target in networkData || Fail`missing network data for ${b(target)}`;
    const entry = networkData[target];
    if (!entry) {
      logger?.info(`skipping YDS chain metadata for ${target}`);
      return undefined;
    }
    const [cluster, yds] = entry;
    const config: Partial<PortfolioDeployConfig> = { cluster };
    const updatedConfig = await updateConfigFromYds({
      config: config as PortfolioDeployConfig,
      yds,
      fetch: fetchFn,
    });
    return (updatedConfig as Required<typeof updatedConfig>).chainMetadata;
  };

  type NetworkConfig = MinimalNetworkConfig & { apiAddrs: string[] };
  type TargetContext = TargetInfo & { config: NetworkConfig };
  const contextCache = new Map<Target, Promise<TargetContext>>();
  const fetchContextForTarget = (upgradeTarget: Target) =>
    provideLazyMap(contextCache, upgradeTarget, async () => {
      const targetInfo = getTargetInfo(upgradeTarget);
      const { network } = targetInfo;
      const baseConfig = await fetchNetworkConfig(network, { fetch: fetchFn });
      const config = { apiAddrs: [] as string[], ...baseConfig };
      config.rpcAddrs?.length >= 1 || Fail`missing rpcAddrs for ${q(network)}`;
      config.apiAddrs?.length >= 1 || Fail`missing apiAddrs for ${q(network)}`;
      return { ...targetInfo, config };
    });
  const connectTargetRpc = async (upgradeTarget: Target) => {
    const { config } = await fetchContextForTarget(upgradeTarget);
    return connectRpc(config.rpcAddrs[0]);
  };
  const makeTxApiForTarget = async (upgradeTarget: Target) => {
    const { config } = await fetchContextForTarget(upgradeTarget);
    return makeCosmosTxApi(config.apiAddrs, { fetchFn, setTimeout });
  };
  const makeVstorageApiForTarget = async (upgradeTarget: Target) => {
    const { config } = await fetchContextForTarget(upgradeTarget);
    return makeAgoricVstorageApi(config.apiAddrs, { fetchFn, setTimeout });
  };
  const makeUpgradeRequestBuilder = async (upgradeTarget: Target) => {
    const { contract, config } = await fetchContextForTarget(upgradeTarget);
    const walletKit = await makeWalletKit({ fetch: fetchFn, delay }, config);
    return buildUpgradeRequestBuilder({
      contract,
      networkConfig: config,
      grantee,
      queryClient: await connectRpc(config.rpcAddrs[0]),
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
      : ({ ...walletAdmin, exec: async () => Fail`unauthorized` } as CmdRunner);
  const submitTargetRpc =
    subcommand === 'phase-upgrade-submit'
      ? connectTargetRpc
      : async (_upgradeTarget: Target) => Fail`unauthorized`;

  const commit =
    subcommand === 'phase-pre-upgrade'
      ? (await git.exec(['rev-parse', 'HEAD'])).stdout.trim()
      : '';
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
      fetchReleaseByAsset,
      fetchChainMetadata,
      diff,
      logger,
      installBundle,
      upgradeLogs,
      walletAdmin: submitWalletAdmin,
      connectTargetRpc: submitTargetRpc,
      makeUpgradeRequestBuilder,
      makeTxApiForTarget,
      makeVstorageApiForTarget,
      setTimeout,
      now,
      grantee,
    },
  );

  switch (subcommand) {
    case 'phase-pre-upgrade': {
      writeJson(stdout, await graph.ensureNode(`phase-pre-upgrade:${target}`));
      break;
    }
    case 'phase-upgrade-args': {
      writeJson(stdout, await graph.ensureNode(`phase-upgrade-args:${target}`));
      break;
    }
    case 'phase-upgrade-generate': {
      const unsignedTxAssetName = detachedUnsignedTxAssetName(target, grantee);
      if (grantee) {
        const releaseInfo = await release.readOnly().get();
        if (hasAsset(releaseInfo, unsignedTxAssetName)) {
          const verificationInputs = { release, unsignedTxAssetName, grantee };
          await ensureGranteeMatchesUnsignedTx(verificationInputs);
        }
      }
      const generated = await graph.ensureNode<object>(unsignedTxAssetName);
      const signedTxAssetName = detachedSignedTxAssetName(target, grantee);
      const signatureInputs = {
        target,
        release,
        unsignedTxAssetName,
        signedTxAssetName,
        connectTargetRpc,
      };
      const releaseInfo = await release.readOnly().get();
      const alreadySigned = hasAsset(releaseInfo, signedTxAssetName);
      const combineResult: CombineSignaturesResult | undefined =
        !alreadySigned && grantee
          ? await tryCombineDetachedSignatures(signatureInputs)
          : undefined;
      const readyToBroadcast = alreadySigned || combineResult?.ready === true;
      const agdSignCommand = readyToBroadcast
        ? undefined
        : await rebuildAgdSignCommand({
            ...signatureInputs,
            releaseTag: tag,
            grantee,
          });
      writeJson(stdout, {
        target,
        phase: 'upgrade-generate',
        record: unsignedTxAssetName,
        detail: { ...generated, ...(agdSignCommand && { agdSignCommand }) },
        readyToBroadcast,
        ...(combineResult && !combineResult.ready
          ? { reason: combineResult.reason }
          : undefined),
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
  main(undefined, undefined, { stderr: process.stderr }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
