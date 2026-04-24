#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-disable no-throw-literal */

// use @endo/init/debug so LOCKDOWN_OPTIONS are consistent with tests
import '@endo/init/debug.js';

import { makeCmdRunner, makeFileRd, makeFileRW } from '@agoric/pola-io';
import { execa } from 'execa';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  bundleIdFromBundleRecord,
  canonicalizePrivateArgs,
  expectedOverridesAssetName,
  targetInfo,
  validateBaseRecord,
  validateInstallRecord,
  validateUpgradeRecord,
} from '../src/ymax-release-policy.mjs';

const usage = `Usage:
  ymax-deploy-target.ts phase-pre-upgrade --target <target> --tag <tag> [--branch <branch>]
  ymax-deploy-target.ts phase-upgrade --target <target> --tag <tag>`;

type Target = 'ymax0-devnet' | 'ymax0-main' | 'ymax1-main';
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
type BaseRecord = {
  target: Target;
  contract: string;
  network: string;
  chainId: string;
  bundleId: string;
};
type InstallRecord = BaseRecord & {
  confirmedInBundles: boolean;
};
type UpgradeRecord = BaseRecord & {
  upgradeTxHash: string;
  upgradeBlockHeight: number;
  upgradeBlockTime: string;
  incarnationNumber: number;
  privateArgsOverridesPath: string;
  healthBlocks: Array<{ height: number; hash: string; time: string }>;
};
type ReleaseAssetInfo = { name: string };
type ReleaseInfo = { assets: ReleaseAssetInfo[]; url: string };
type StepTools = {
  cause: unknown;
  target: Target;
  releaseTag: string;
  commit: string;
  deployPackage: ReturnType<typeof makeDeployPackage>;
  distDir: FileRW;
  release: ReturnType<typeof makeReleaseRW>;
};

const typedTargetInfo = targetInfo as Record<
  Target,
  { contract: 'ymax0' | 'ymax1'; network: 'devnet' | 'main'; chainId: string }
>;

const parseCli = (argv: string[]) => {
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
  return { subcommand, values };
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

const findRelease = async (
  release: ReturnType<ReturnType<typeof makeReleaseRW>['readOnly']>,
) => {
  const found = await release.get({ reject: false });
  if (found.url) {
    return found;
  }
  throw Error('release does not exist');
};

const createRelease = async (
  release: ReturnType<typeof makeReleaseRW>,
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
  target: string,
  privateArgs: string | undefined,
  {
    distDir,
    release,
  }: {
    distDir: FileRW;
    release: ReturnType<typeof makeReleaseRW>;
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

export const validateInstallPrecondition = async (
  target: Target,
  bundleId: string,
  assets: Array<{ name: string }>,
  recordAsset: AssetRd,
) => {
  const name = `${target}-install.json`;
  const assetNames = new Set(assets.map(asset => asset.name));
  if (!assetNames.has(name)) {
    throw Error(`missing required release asset ${name}`);
  }
  validateInstallRecord(
    target,
    bundleId,
    (await recordAsset.readJSON()) as InstallRecord,
  );
};

export const validateUpgradePrecondition = async (
  target: Target,
  bundleId: string,
  assets: ReleaseAssetInfo[],
  recordAsset: AssetRd,
) => {
  const name = `${target}-upgrade.json`;
  const assetNames = new Set(assets.map(asset => asset.name));
  if (!assetNames.has(name)) {
    throw Error(`missing required release asset ${name}`);
  }
  validateUpgradeRecord(
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
  if (!hasAsset(release, `${target}-install.json`)) {
    throw Error(`missing required release asset ${target}-install.json`);
  }
  const record = (await asset.readJSON()) as InstallRecord;
  validateBaseRecord(target, record.bundleId, record);
  if (record.confirmedInBundles !== true) {
    throw Error('confirmedInBundles must be true');
  }
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
  if (!hasAsset(release, `${target}-upgrade.json`)) {
    throw Error(`missing required release asset ${target}-upgrade.json`);
  }
  const record = (await asset.readJSON()) as UpgradeRecord;
  validateUpgradeRecord(target, install.bundleId, record);
  if (target !== currentTarget) {
    return record;
  }
  const assetName = expectedOverridesAssetName(target, privateArgs);
  if (record.privateArgsOverridesPath !== assetName) {
    throw Error(
      `existing ${target}-upgrade.json uses ${record.privateArgsOverridesPath}, not ${assetName}; remove or rename ${target}-upgrade.json to change private args`,
    );
  }
  return record;
};

const recordUpgradeContract = async (
  upgradeTarget: Target,
  install: InstallRecord,
  asset: AssetRW,
  {
    cause,
    target,
    privateArgs,
    distDir,
    release,
    walletAdmin,
    upgradeLogs,
  }: StepTools & {
    privateArgs: string | undefined;
    walletAdmin: CmdRunner;
    upgradeLogs: CmdRunner;
  },
) => {
  expectMissing(
    cause,
    `missing required release asset ${upgradeTarget}-upgrade.json`,
  );
  if (target !== upgradeTarget) {
    throw Error(`missing required release asset ${upgradeTarget}-upgrade.json`);
  }
  const info = getTargetInfo(upgradeTarget);
  const overrides = await createOverrides(upgradeTarget, privateArgs, {
    distDir,
    release,
  });
  const resultFile = distDir.join(`${upgradeTarget}-upgrade-result.json`);

  await walletAdmin.exec(
    [
      './packages/portfolio-deploy/src/ymax-upgrade.ts',
      ...flags({
        contract: info.contract,
        bundle: install.bundleId,
        overrides: overrides.file.toString(),
        'result-file': resultFile.toString(),
      }),
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] } as any,
  );
  const result = JSON.parse(await resultFile.readOnly().readText()) as Pick<
    UpgradeRecord,
    | 'upgradeTxHash'
    | 'upgradeBlockHeight'
    | 'upgradeBlockTime'
    | 'bundleId'
    | 'healthBlocks'
  >;

  const { stdout: slogsText } = await upgradeLogs.exec(
    flags({
      contract: info.contract,
      network: info.network,
      'tx-hash': result.upgradeTxHash,
    }),
    { stdio: ['ignore', 'pipe', 'inherit'] } as any,
  );
  const sortedLogEntries = sortUpgradeLogs(decodeUpgradeLogs(slogsText));
  const slogAssetName = `${upgradeTarget}-upgrade-logs.ndjson`;
  const normLogsAssetName = `${upgradeTarget}-upgrade-logs.norm.txt`;

  await release.join(slogAssetName).writeText(slogsText);
  await release
    .join(normLogsAssetName)
    .writeText(makeNormText(sortedLogEntries));

  const incarnationNumber = findUpgradeIncarnation({
    sortedLogEntries,
    contract: info.contract,
    bundleId: install.bundleId,
  });

  const record = await makeUpgradeRecord(
    upgradeTarget,
    install.bundleId,
    {
      ...result,
      incarnationNumber,
    },
    overrides.assetName,
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

const synthetic = async () => {
  throw Error('synthetic');
};

const reportUpgradePhase =
  (stdout: Pick<typeof process.stdout, 'write'>, target: Target) =>
  async ({ install, upgrade }: Record<string, unknown>) =>
    writeJson(stdout, {
      target,
      phase: 'upgrade',
      record: `${target}-upgrade.json`,
      detail: {
        bundleId: (install as InstallRecord).bundleId,
        ...(upgrade as object),
      },
    });

const makeGraph = (
  target: Target,
  tag: string,
  branch: string | undefined,
  commit: string,
  privateArgs: string | undefined,
  {
    deployPackage,
    release,
    installBundle,
    walletAdmin,
    upgradeLogs,
    stdout,
  }: {
    deployPackage: ReturnType<typeof makeDeployPackage>;
    release: ReturnType<typeof makeReleaseRW>;
    installBundle: CmdRunner;
    walletAdmin: CmdRunner;
    upgradeLogs: CmdRunner;
    stdout: Pick<typeof process.stdout, 'write'>;
  },
) => {
  const cache = new Map<string, Promise<unknown>>();

  const devBranch = branch === 'main' ? undefined : branch;

  const tools = {
    releaseTag: tag,
    commit,
    target,
    deployPackage,
    distDir: deployPackage.distDir,
    release,
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

    'ymax0-devnet-upgrade.json': {
      deps: { release: 'release', install: 'ymax0-devnet-install.json' },
      find: (asset, { release: relInfo, install }) =>
        findUpgrade(
          'ymax0-devnet',
          asset,
          relInfo as ReleaseInfo,
          install as InstallRecord,
          target,
          privateArgs,
        ),
      create: ({ install }, asset, cause) =>
        recordUpgradeContract(
          'ymax0-devnet',
          install as InstallRecord,
          asset!,
          { cause, privateArgs, walletAdmin, upgradeLogs, ...tools },
        ),
    },
    'ymax0-main-upgrade.json': {
      deps: { release: 'release', install: 'ymax0-main-install.json' },
      find: (asset, { release: relInfo, install }) =>
        findUpgrade(
          'ymax0-main',
          asset,
          relInfo as ReleaseInfo,
          install as InstallRecord,
          target,
          privateArgs,
        ),
      create: ({ install }, asset, cause) =>
        recordUpgradeContract('ymax0-main', install as InstallRecord, asset!, {
          cause,
          privateArgs,
          walletAdmin,
          upgradeLogs,
          ...tools,
        }),
    },
    'ymax1-main-upgrade.json': {
      deps: { release: 'release', install: 'ymax0-main-install.json' },
      find: (asset, { release: relInfo, install }) =>
        findUpgrade(
          'ymax1-main',
          asset,
          relInfo as ReleaseInfo,
          install as InstallRecord,
          target,
          privateArgs,
        ),
      create: ({ install }, asset, cause) =>
        recordUpgradeContract('ymax1-main', install as InstallRecord, asset!, {
          cause,
          privateArgs,
          walletAdmin,
          upgradeLogs,
          ...tools,
        }),
    },

    'phase-pre-upgrade:ymax0-devnet': {
      deps: {
        release: 'release',
        bundle: 'bundle-ymax0.json',
        install: 'ymax0-devnet-install.json',
      },
      find: synthetic,
      create: async ({ release: ensuredRelease, install }) =>
        writeJson(stdout, {
          target,
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
      find: synthetic,
      create: async ({ release: ensuredRelease, install }) =>
        writeJson(stdout, {
          target,
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
      find: synthetic,
      create: async ({ release: ensuredRelease }) =>
        writeJson(stdout, {
          target,
          phase: 'pre-upgrade',
          detail: { url: (ensuredRelease as ReleaseInfo).url },
        }),
    },
    'phase-upgrade:ymax0-devnet': {
      deps: {
        install: 'ymax0-devnet-install.json',
        upgrade: 'ymax0-devnet-upgrade.json',
      },
      find: synthetic,
      create: reportUpgradePhase(stdout, 'ymax0-devnet'),
    },
    'phase-upgrade:ymax0-main': {
      deps: {
        devnetInstall: 'ymax0-devnet-install.json',
        devnetUpgrade: 'ymax0-devnet-upgrade.json',
        install: 'ymax0-main-install.json',
        upgrade: 'ymax0-main-upgrade.json',
      },
      find: synthetic,
      create: reportUpgradePhase(stdout, 'ymax0-main'),
    },
    'phase-upgrade:ymax1-main': {
      deps: {
        install: 'ymax0-main-install.json',
        priorUpgrade: 'ymax0-main-upgrade.json',
        upgrade: 'ymax1-main-upgrade.json',
      },
      find: synthetic,
      create: reportUpgradePhase(stdout, 'ymax1-main'),
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

  return { ensureNode };
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
    stdout = process.stdout as Pick<typeof process.stdout, 'write'>,
  } = {},
) => {
  const {
    GITHUB_TOKEN: ghToken,
    AGORIC_NET,
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
  const { subcommand, values } = parseCli(argv);

  const tag = requireString(values.tag, 'tag');
  const release = makeReleaseRW(tag, {
    gh,
    scratchDir: deployPackage.distDir,
  });
  const target = requireString(values.target, 'target') as Target;
  const commit =
    subcommand === 'phase-pre-upgrade'
      ? (await git.exec(['rev-parse', 'HEAD'])).stdout.trim()
      : '';
  const graph = makeGraph(
    target,
    tag,
    typeof values.branch === 'string' ? values.branch : undefined,
    commit,
    PRIVATE_ARGS_OVERRIDES,
    {
      deployPackage,
      release,
      installBundle,
      walletAdmin,
      upgradeLogs,
      stdout,
    },
  );

  switch (subcommand) {
    case 'phase-pre-upgrade':
      await graph.ensureNode(`phase-pre-upgrade:${target}`);
      break;
    case 'phase-upgrade':
      await graph.ensureNode(`phase-upgrade:${target}`);
      break;
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
