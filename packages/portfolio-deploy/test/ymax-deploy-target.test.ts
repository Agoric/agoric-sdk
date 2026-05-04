import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import path from 'node:path';

import { makeFileRW } from '@agoric/pola-io';

import {
  main,
  validateInstallPrecondition,
  validateUpgradePrecondition,
} from '../scripts/ymax-deploy-target.ts';

test('policy prerequisite checks are enforced', async t => {
  await t.throwsAsync(
    validateInstallPrecondition('ymax0-devnet', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-devnet-install.json' },
    'ymax0-main pre-upgrade requires ymax0-devnet install evidence',
  );
  await t.throwsAsync(
    validateUpgradePrecondition('ymax0-devnet', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-devnet-upgrade.json' },
    'ymax0-main pre-upgrade requires ymax0-devnet upgrade evidence',
  );
  await t.throwsAsync(
    validateInstallPrecondition('ymax0-devnet', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-devnet-install.json' },
    'ymax0-main upgrade requires ymax0-devnet install evidence',
  );
  await t.throwsAsync(
    validateUpgradePrecondition('ymax0-devnet', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-devnet-upgrade.json' },
    'ymax0-main upgrade requires ymax0-devnet upgrade evidence',
  );
  await t.throwsAsync(
    validateInstallPrecondition('ymax0-main', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-main-install.json' },
    'ymax1-main pre-upgrade requires ymax0-main install evidence',
  );
  await t.throwsAsync(
    validateUpgradePrecondition('ymax0-main', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-main-upgrade.json' },
    'ymax1-main pre-upgrade requires ymax0-main upgrade evidence',
  );
  await t.throwsAsync(
    validateInstallPrecondition('ymax0-main', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-main-install.json' },
    'ymax1-main upgrade requires ymax0-main install evidence',
  );
});

test('policy evidence validation checks are enforced', async t => {
  await t.throwsAsync(
    validateInstallPrecondition(
      'ymax0-devnet',
      'b1-abc123',
      [{ name: 'ymax0-devnet-install.json' }],
      assetRdFromJSON({
        ...examples.install.devnet0,
        releaseTag: undefined,
        commit: undefined,
        bundleId: 'b1-wrong',
        installTxHash: 'TX123',
        installBlockHeight: 77,
        installBlockTime: '2026-04-16T12:00:00.000Z',
      }),
    ),
    { message: 'expected bundleId=b1-abc123, got b1-wrong' },
    'install evidence must match bundleId',
  );
  await t.throwsAsync(
    validateInstallPrecondition(
      'ymax0-main',
      'b1-abc123',
      [{ name: 'ymax0-main-install.json' }],
      assetRdFromJSON({
        ...examples.install.main0,
        confirmedInBundles: false,
      }),
    ),
    { message: 'confirmedInBundles must be true' },
    'install evidence must prove bundle confirmation',
  );
  await t.throwsAsync(
    validateUpgradePrecondition(
      'ymax0-main',
      'b1-abc123',
      [{ name: 'ymax0-main-upgrade.json' }],
      assetRdFromJSON({
        ...examples.upgrade.main0,
        privateArgsOverridesPath: 'overrides.json',
        healthBlocks: [{ height: 1, hash: 'h1', time: 't1' }],
      }),
    ),
    { message: 'invalid upgrade record' },
    'upgrade evidence must validate proof',
  );
});

const flags = (spec: Record<string, string | undefined>) =>
  Object.entries(spec).flatMap(([name, value]) =>
    value === undefined ? [] : [`--${name}`, value],
  );

const mockGh = (
  releases: Map<string, { url: string; assets: Map<string, string> }>,
  files: Map<string, string>,
) => {
  return async (
    _cmd: string,
    args: string[],
    opts?: { encoding?: BufferEncoding | 'buffer'; reject?: boolean },
  ) => {
    const [sub1, sub2, tag] = args;
    if (sub1 === 'release' && sub2 === 'view') {
      const release = releases.get(tag);
      if (!release && opts?.reject === false) {
        return { stdout: '{}', exitCode: 1 };
      }
      return {
        stdout: JSON.stringify(
          release
            ? {
                url: release.url,
                assets: [...release.assets.keys()].map(name => ({ name })),
              }
            : {},
        ),
      };
    }
    if (sub1 === 'release' && sub2 === 'create') {
      releases.set(tag, {
        url: `https://example.invalid/releases/${tag}`,
        assets: new Map(),
      });
      return { stdout: '' };
    }
    if (sub1 === 'release' && sub2 === 'upload') {
      const release = releases.get(tag);
      if (!release) {
        throw Error(`release missing for upload: ${tag}`);
      }
      const [assetPath, assetName] = args[3].split('#');
      const text = files.get(assetPath);
      if (text === undefined) {
        throw Error(`upload missing file: ${assetPath}`);
      }
      release.assets.set(assetName, text);
      return { stdout: '' };
    }
    if (sub1 === 'release' && sub2 === 'download') {
      const release = releases.get(tag);
      if (!release) {
        throw Error(`release missing for download: ${tag}`);
      }
      const name = args[args.indexOf('--pattern') + 1];
      const text = release.assets.get(name);
      if (text === undefined) {
        throw Error(`asset missing for download: ${name}`);
      }
      const output = args[args.indexOf('--output') + 1];
      if (output === '-') {
        return {
          stdout:
            opts?.encoding === 'buffer' ? Buffer.from(text, 'utf8') : text,
        };
      }
      files.set(output, text);
      return { stdout: '' };
    }
    throw Error(`unexpected gh args: ${args.join(' ')}`);
  };
};

const mockDeployPackage = (repoRoot = '/agoric-sdk') => {
  const files = new Map<string, string>();
  const resolvePath = (p: string) => path.resolve(repoRoot, p);
  const bundleFile = resolvePath(
    'packages/portfolio-deploy/dist/bundle-ymax0.json',
  );
  files.set(
    bundleFile,
    `${JSON.stringify({ endoZipBase64Sha512: 'abc123' }, null, 2)}\n`,
  );

  const fsp = {
    mkdir: async (_there: string, _opts?: unknown) => undefined,
    writeFile: async (there: string, text: string | Uint8Array) => {
      files.set(
        there,
        typeof text === 'string' ? text : Buffer.from(text).toString('utf8'),
      );
    },
    readFile: async (there: string, encoding?: BufferEncoding) => {
      const text = files.get(there);
      if (text === undefined) {
        throw Error(`ENOENT: ${there}`);
      }
      return encoding === 'utf8' ? text : Buffer.from(text, 'utf8');
    },
  };
  const agoricSdk = makeFileRW(repoRoot, {
    fsp: fsp as any, // XXX mock
    path: { ...path, join: path.resolve },
  });

  return { agoricSdk, files };
};

const assetRdFromJSON = (specimen: unknown) => ({
  exists: async () => null as never,
  copyTo: async () => null as never,
  read: async () => null as never,
  readText: async () => null as never,
  readJSON: async () => specimen as any,
});

const jsonText = (specimen: unknown) =>
  `${JSON.stringify(specimen, null, 2)}\n`;

const makeUpgradeLogsNdjson = ({
  contract,
  bundleId,
  incarnationNumber,
  vatID = 'v1',
}: {
  contract: string;
  bundleId: string;
  incarnationNumber: number;
  vatID?: string;
}) =>
  [
    {
      content: JSON.stringify({
        time: 1776916591.123,
        body: {
          type: 'console',
          source: 'vat',
          state: 'delivery',
          vatID,
          level: 'info',
          args: ['----- CCtrl,1 ', contract, 'upgrade', bundleId],
        },
        attributes: {
          'process.uptime': 3537.123,
        },
      }),
    },
    {
      content: JSON.stringify({
        time: 1776916753.86153,
        body: {
          type: 'console',
          source: 'vat',
          state: 'delivery',
          vatID,
          level: 'info',
          args: [
            '----- CCtrl,1 ',
            contract,
            'upgrade result',
            `{ incarnationNumber: ${incarnationNumber} }`,
          ],
        },
        attributes: {
          'process.uptime': 3539.467927223,
        },
      }),
    },
  ]
    .map(line => JSON.stringify(line))
    .join('\n')
    .concat('\n');

const examples = {
  bundle: { endoZipBase64Sha512: 'abc123' },
  install: {
    devnet0: {
      target: 'ymax0-devnet',
      releaseTag: 'v0.3.2604-beta1',
      commit: '4a17f0878bceee3a5af27ae156cb81f6bcb48255',
      contract: 'ymax0',
      network: 'devnet',
      chainId: 'agoricdev-25',
      bundleId: 'b1-abc123',
      installTxHash: 'TXDEV',
      installBlockHeight: 70,
      installBlockTime: '2026-04-16T11:00:00.000Z',
      confirmedInBundles: true,
    },
    main0: {
      target: 'ymax0-main',
      releaseTag: 'v0.3.2604-beta1',
      commit: '4a17f0878bceee3a5af27ae156cb81f6bcb48255',
      contract: 'ymax0',
      network: 'main',
      chainId: 'agoric-3',
      bundleId: 'b1-abc123',
      installTxHash: 'TXMAIN',
      installBlockHeight: 77,
      installBlockTime: '2026-04-16T12:00:00.000Z',
      confirmedInBundles: true,
    },
  },
  upgrade: {
    devnet0: {
      target: 'ymax0-devnet',
      contract: 'ymax0',
      network: 'devnet',
      chainId: 'agoricdev-25',
      bundleId: 'b1-abc123',
      upgradeTxHash: 'UPDEV',
      upgradeBlockHeight: 71,
      upgradeBlockTime: '2026-04-16T11:05:00.000Z',
      incarnationNumber: 58,
      privateArgsOverridesPath:
        'ymax0-devnet-privateArgsOverrides-deadbeef.json',
      healthBlocks: [
        { height: 72, hash: 'h72', time: 't72' },
        { height: 73, hash: 'h73', time: 't73' },
      ],
    },
    main0: {
      target: 'ymax0-main',
      contract: 'ymax0',
      network: 'main',
      chainId: 'agoric-3',
      bundleId: 'b1-abc123',
      upgradeTxHash: 'UPMAIN0',
      upgradeBlockHeight: 78,
      upgradeBlockTime: '2026-04-16T12:05:00.000Z',
      incarnationNumber: 59,
      privateArgsOverridesPath: 'ymax0-main-privateArgsOverrides-feedface.json',
      healthBlocks: [
        { height: 79, hash: 'h79', time: 't79' },
        { height: 80, hash: 'h80', time: 't80' },
      ],
    },
  },
};

const seedRelease = (
  releases: Map<string, { url: string; assets: Map<string, string> }>,
  releaseTag: string,
  assets: Record<string, string>,
) => {
  releases.set(releaseTag, {
    url: `https://example.invalid/releases/${releaseTag}`,
    assets: new Map(Object.entries(assets)),
  });
};

const snapshotPhase = (
  t: {
    snapshot: (expected: unknown, message?: string) => void;
  },
  {
    label,
    execs,
    normalize,
    stdoutChunks,
  }: {
    label: 'pre-upgrade' | 'upgrade';
    execs: Array<Record<string, unknown>>;
    normalize: (value: unknown) => unknown;
    stdoutChunks: string[];
  },
) => {
  t.snapshot(
    execs.map(event =>
      JSON.parse(JSON.stringify(event), (_key, value) => normalize(value)),
    ),
    `${label} execs`,
  );

  t.snapshot(
    stdoutChunks.length === 1
      ? JSON.parse(stdoutChunks[0])
      : stdoutChunks.map(chunk => JSON.parse(chunk)),
    `${label} stdout`,
  );
};

const snapshotAssets = (
  t: {
    snapshot: (expected: unknown, message?: string) => void;
  },
  {
    releases,
    releaseTag,
  }: {
    releases: Map<string, { url: string; assets: Map<string, string> }>;
    releaseTag: string;
  },
) => {
  t.snapshot(
    Object.fromEntries(
      [...(releases.get(releaseTag)?.assets.entries() ?? [])]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, text]) => [
          name,
          name === 'bundle-ymax0.json' ? '<bundle>' : text,
        ]),
    ),
    `assets ${releaseTag}`,
  );
};

const happyPathReleaseTag = 'v0.3.2604-beta1';

type ExecOpts = {
  encoding?: BufferEncoding | 'buffer';
  env?: Record<string, string | undefined>;
  reject?: boolean;
  cwd?: string;
  stdio?: unknown;
};

const makeExecEvent = (
  normalize: (value: unknown) => unknown,
  cmd: string,
  args: string[],
  opts?: ExecOpts,
) =>
  ({
    command: [cmd, ...args].map(arg => normalize(arg) as string).join(' '),
    cwd: opts?.cwd ? (normalize(opts.cwd) as string) : undefined,
    env:
      opts?.env &&
      Object.fromEntries(
        Object.entries(opts.env)
          .filter(([, value]) => value !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [
            key,
            key.includes('TOKEN') ? '<redacted>' : normalize(value),
          ]),
      ),
  }) as Record<string, unknown>;

const fakeYmaxUpgrade = (
  execs: Array<Record<string, unknown>>,
  normalize: (value: unknown) => unknown,
  files: Map<string, string>,
  cmd: string,
  args: string[],
  opts?: ExecOpts,
  payload = examples.upgrade.main0,
) => {
  if (!cmd.endsWith('/wallet-admin.ts')) {
    return undefined;
  }
  if (args[0] !== './packages/portfolio-deploy/src/ymax-upgrade.ts') {
    return undefined;
  }
  const event = makeExecEvent(normalize, cmd, args, opts as ExecOpts);
  const resultText = `${JSON.stringify(
    {
      upgradeTxHash: payload.upgradeTxHash,
      upgradeBlockHeight: payload.upgradeBlockHeight,
      upgradeBlockTime: payload.upgradeBlockTime,
      bundleId: payload.bundleId,
      healthBlocks: payload.healthBlocks,
    },
    null,
    2,
  )}\n`;
  const resultFile = args[args.indexOf('--result-file') + 1];
  files.set(resultFile, resultText);
  event.stdout = '';
  execs.push(event);
  return { stdout: '' };
};

const fakeUpgradeLogs = (
  execs: Array<Record<string, unknown>>,
  normalize: (value: unknown) => unknown,
  cmd: string,
  args: string[],
  opts?: ExecOpts,
  {
    contract = 'ymax0',
    bundleId = 'b1-abc123',
    incarnationNumber = 58,
  }: {
    contract?: string;
    bundleId?: string;
    incarnationNumber?: number;
  } = {},
) => {
  if (!cmd.endsWith('/ymax-upgrade-run-logs.ts')) {
    return undefined;
  }
  const event = makeExecEvent(normalize, cmd, args, opts as ExecOpts);
  const stdout = makeUpgradeLogsNdjson({
    contract,
    bundleId,
    incarnationNumber,
  });
  event.stdout = normalize(stdout) as string;
  execs.push(event);
  return { stdout };
};

const makeScenario = (repoRoot = '/agoric-sdk') => {
  const { agoricSdk, files } = mockDeployPackage(repoRoot);
  const releases = new Map<
    string,
    { url: string; assets: Map<string, string> }
  >();
  const execs: Array<Record<string, unknown>> = [];
  const stdoutChunks: string[] = [];
  const ghExecFile = mockGh(releases, files);

  const normalize = (value: unknown): unknown =>
    typeof value === 'string' ? value.replaceAll(repoRoot, '<repo>') : value;
  const env = {
    GITHUB_TOKEN: 'fake-token',
    AGORIC_NET: 'main',
    MNEMONIC: 'control secret',
  } satisfies Record<string, string>;
  const execFile = async (
    cmd: string,
    args: string[],
    opts?: ExecOpts,
    ..._rest: unknown[]
  ) => {
    const event = makeExecEvent(normalize, cmd, args, opts);
    execs.push(event);

    try {
      let result: { stdout?: string | Buffer; exitCode?: number };
      if (cmd === 'gh') {
        result = await ghExecFile(cmd, args, opts);
      } else if (cmd === 'yarn') {
        result = { stdout: '' };
      } else if (
        cmd === 'git' &&
        args.length === 2 &&
        args[0] === 'rev-parse'
      ) {
        result = { stdout: '4a17f0878bceee3a5af27ae156cb81f6bcb48255\n' };
      } else if (cmd.endsWith('/install-bundle.ts')) {
        result = {
          stdout: JSON.stringify({
            txHash: 'TX123',
            blockHeight: 77,
            blockTime: '2026-04-16T12:00:00.000Z',
            bundleId: 'b1-abc123',
          }),
        };
      } else {
        result = await Promise.reject(
          Error(`unexpected command: ${cmd} ${args.join(' ')}`),
        );
      }
      if (
        'stdout' in result &&
        result.stdout !== undefined &&
        result.stdout !== ''
      ) {
        event.stdout =
          result.stdout instanceof Buffer
            ? '<buffer>'
            : (normalize(result.stdout) as string);
      }
      if ('exitCode' in result && result.exitCode && result.exitCode !== 0) {
        event.exitCode = result.exitCode;
      }
      return result;
    } catch (err: any) {
      event.exitCode = err?.exitCode ?? 1;
      if (err?.stdout !== undefined && err.stdout !== '') {
        event.stdout = normalize(err.stdout) as string;
      }
      throw err;
    }
  };

  return {
    repoRoot,
    agoricSdk,
    files,
    releases,
    execs,
    stdoutChunks,
    ghExecFile,
    normalize,
    env,
    stdout: {
      write: (chunk: string) => {
        stdoutChunks.push(chunk);
        return true;
      },
    },
    execFile,
  };
};

const runPhase = async (
  {
    agoricSdk,
    execFile,
    stdout,
  }: Pick<ReturnType<typeof makeScenario>, 'agoricSdk' | 'execFile' | 'stdout'>,
  phase: 'phase-pre-upgrade' | 'phase-upgrade',
  args: Record<string, string | undefined>,
  env: Record<string, string | undefined>,
) =>
  main(
    [
      'node',
      'packages/portfolio-deploy/scripts/ymax-deploy-target.ts',
      phase,
      ...flags(args),
    ],
    env,
    {
      execFile: execFile as unknown as typeof import('execa').execa,
      agoricSdk,
      path,
      stdout,
    },
  );

const clearTrace = ({
  execs,
  stdoutChunks,
}: Pick<ReturnType<typeof makeScenario>, 'execs' | 'stdoutChunks'>) => {
  execs.length = 0;
  stdoutChunks.length = 0;
};

test('ymax0-devnet phase-upgrade does not require local bundle', async t => {
  const {
    agoricSdk,
    files,
    releases,
    stdout,
    env,
    execs,
    normalize,
    execFile: baseExecFile,
  } = makeScenario();
  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
    const result = fakeYmaxUpgrade(execs, normalize, files, cmd, args, opts);
    if (result) {
      return result;
    }
    const logResult = fakeUpgradeLogs(execs, normalize, cmd, args, opts, {
      contract: 'ymax0',
      bundleId: 'b1-abc123',
      incarnationNumber: examples.upgrade.devnet0.incarnationNumber,
    });
    if (logResult) {
      return logResult;
    }
    return baseExecFile(cmd, args, opts, ...rest);
  };
  const releaseTag = 'v0.3.2604-beta1';
  files.delete(
    agoricSdk
      .join('packages/portfolio-deploy/dist/bundle-ymax0.json')
      .toString(),
  );
  seedRelease(releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
  });

  await runPhase(
    {
      agoricSdk,
      execFile,
      stdout,
    },
    'phase-upgrade',
    { target: 'ymax0-devnet', tag: releaseTag },
    {
      ...env,
      AGORIC_NET: 'devnet',
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  t.true(releases.get(releaseTag)?.assets.has('ymax0-devnet-upgrade.json'));
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/install-bundle.ts'),
    ),
  );
});

test('ymax0-devnet pre-upgrade requires local bundle even if release asset exists', async t => {
  const {
    agoricSdk,
    files,
    releases,
    execs,
    stdoutChunks,
    stdout,
    env,
    execFile,
  } = makeScenario();
  const releaseTag = 'v0.3.2604-beta1';
  files.delete(
    agoricSdk
      .join('packages/portfolio-deploy/dist/bundle-ymax0.json')
      .toString(),
  );
  seedRelease(releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
  });

  await t.throwsAsync(
    runPhase(
      {
        agoricSdk,
        execFile,
        stdout,
      },
      'phase-pre-upgrade',
      {
        target: 'ymax0-devnet',
        tag: releaseTag,
        branch: 'master',
      },
      { ...env, AGORIC_NET: 'devnet' },
    ),
    {
      message: 'missing local bundle-ymax0.json',
    },
  );

  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('gh release upload') &&
        event.command.includes('#bundle-ymax0.json'),
    ),
  );
  t.false(
    releases.get(releaseTag)?.assets.has('ymax0-devnet-install.json') ?? false,
  );
  t.deepEqual(stdoutChunks, []);
});

test('reject ymax1-main upgrade without ymax0-main upgrade evidence', async t => {
  const { agoricSdk, releases, execs, stdoutChunks, stdout, env, execFile } =
    makeScenario();

  releases.set('v0.3.2604-beta1', {
    url: 'https://example.invalid/releases/v0.3.2604-beta1',
    assets: new Map([
      [
        'bundle-ymax0.json',
        `${JSON.stringify({ endoZipBase64Sha512: 'abc123' }, null, 2)}\n`,
      ],
    ]),
  });

  await t.throwsAsync(
    main(
      [
        'node',
        'packages/portfolio-deploy/scripts/ymax-deploy-target.ts',
        'phase-upgrade',
        ...flags({ target: 'ymax1-main', tag: 'v0.3.2604-beta1' }),
      ],
      {
        ...env,
        MNEMONIC: 'not-used',
      },
      {
        execFile: execFile as unknown as typeof import('execa').execa,
        agoricSdk,
        path,
        stdout,
      },
    ),
    {
      message: 'missing required release asset ymax0-main-install.json',
    },
  );
  t.deepEqual(stdoutChunks, []);
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );
});

test.serial('deploy ymax0-main', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const { execFile: baseExecFile } = ctx;
  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
    const result = fakeYmaxUpgrade(
      ctx.execs,
      ctx.normalize,
      ctx.files,
      cmd,
      args,
      opts,
    );
    if (result) {
      return result;
    }
    const logResult = fakeUpgradeLogs(
      ctx.execs,
      ctx.normalize,
      cmd,
      args,
      opts,
      {
        contract: 'ymax0',
        bundleId: 'b1-abc123',
        incarnationNumber: examples.upgrade.main0.incarnationNumber,
      },
    );
    if (logResult) {
      return logResult;
    }
    return baseExecFile(cmd, args, opts, ...rest);
  };

  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText({
      ...examples.install.devnet0,
      releaseTag,
    }),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
  });

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile: baseExecFile,
      stdout: ctx.stdout,
    },
    'phase-pre-upgrade',
    { target: 'ymax0-main', tag: releaseTag },
    { ...ctx.env, YMAX_INSTALL_BUNDLE_MNEMONIC: 'install secret' },
  );
  snapshotPhase(t, {
    label: 'pre-upgrade',
    execs: ctx.execs,
    normalize: ctx.normalize,
    stdoutChunks: ctx.stdoutChunks,
  });
  clearTrace(ctx);

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile: baseExecFile,
      stdout: ctx.stdout,
    },
    'phase-pre-upgrade',
    { target: 'ymax0-main', tag: releaseTag },
    { ...ctx.env, YMAX_INSTALL_BUNDLE_MNEMONIC: 'install secret' },
  );

  t.false(
    ctx.execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/install-bundle.ts'),
    ),
  );
  t.deepEqual(JSON.parse(ctx.stdoutChunks[0]), {
    phase: 'pre-upgrade',
    target: 'ymax0-main',
    detail: {
      url: `https://example.invalid/releases/${releaseTag}`,
      ...examples.install.main0,
      releaseTag,
      installTxHash: 'TX123',
    },
  });
  clearTrace(ctx);

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile,
      stdout: ctx.stdout,
    },
    'phase-upgrade',
    { target: 'ymax0-main', tag: releaseTag },
    { ...ctx.env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}' },
  );

  t.true(
    ctx.releases.get(releaseTag)?.assets.has('ymax0-main-install.json') ??
      false,
  );
  t.true(
    ctx.releases.get(releaseTag)?.assets.has('ymax0-main-upgrade.json') ??
      false,
  );
  snapshotPhase(t, {
    label: 'upgrade',
    execs: ctx.execs,
    normalize: ctx.normalize,
    stdoutChunks: ctx.stdoutChunks,
  });
  snapshotAssets(t, { releases: ctx.releases, releaseTag });
});

test('ymax1-main upgrade precondition requires ymax0-main upgrade asset', async t => {
  await t.throwsAsync(
    validateUpgradePrecondition('ymax0-main', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-main-upgrade.json' },
  );
});

test('existing invalid step record fails hard instead of being overwritten', async t => {
  const { agoricSdk, releases, execs, stdoutChunks, stdout, env, execFile } =
    makeScenario();

  const badInstallRecord = `${JSON.stringify(
    {
      target: 'ymax0-devnet',
      contract: 'ymax0',
      network: 'devnet',
      chainId: 'agoricdev-25',
      bundleId: 'b1-abc123',
      installTxHash: 'TX123',
      installBlockHeight: 77,
      installBlockTime: '2026-04-16T12:00:00.000Z',
      confirmedInBundles: false,
    },
    null,
    2,
  )}\n`;

  releases.set('v0.3.2604-beta1', {
    url: 'https://example.invalid/releases/v0.3.2604-beta1',
    assets: new Map([
      [
        'bundle-ymax0.json',
        `${JSON.stringify({ endoZipBase64Sha512: 'abc123' }, null, 2)}\n`,
      ],
      ['ymax0-devnet-install.json', badInstallRecord],
    ]),
  });

  await t.throwsAsync(
    main(
      [
        'node',
        'packages/portfolio-deploy/scripts/ymax-deploy-target.ts',
        'phase-pre-upgrade',
        ...flags({
          target: 'ymax0-devnet',
          tag: 'v0.3.2604-beta1',
          branch: 'master',
        }),
      ],
      { ...env, AGORIC_NET: 'devnet' },
      {
        execFile: execFile as unknown as typeof import('execa').execa,
        agoricSdk,
        path,
        stdout,
      },
    ),
    {
      message: 'confirmedInBundles must be true',
    },
  );

  t.deepEqual(stdoutChunks, []);
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/install-bundle.ts'),
    ),
  );
  t.is(
    releases.get('v0.3.2604-beta1')?.assets.get('ymax0-devnet-install.json'),
    badInstallRecord,
  );
});

test('operator must remove upgrade artifact to change privateArgsOverrides', async t => {
  const {
    agoricSdk,
    files,
    releases,
    execs,
    stdoutChunks,
    stdout,
    normalize,
    env,
    execFile: baseExecFile,
  } = makeScenario();

  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
    const result = fakeYmaxUpgrade(execs, normalize, files, cmd, args, opts);
    if (result) {
      return result;
    }
    const logResult = fakeUpgradeLogs(execs, normalize, cmd, args, opts, {
      contract: 'ymax0',
      bundleId: 'b1-abc123',
      incarnationNumber: examples.upgrade.main0.incarnationNumber,
    });
    if (logResult) {
      return logResult;
    }
    return baseExecFile(cmd, args, opts, ...rest);
  };

  seedRelease(releases, 'v0.3.2604-beta1', {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  await runPhase(
    {
      agoricSdk,
      execFile,
      stdout,
    },
    'phase-upgrade',
    { target: 'ymax0-main', tag: 'v0.3.2604-beta1' },
    { ...env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value-a"}' },
  );

  const overridesAfterFirstRun = [
    ...(releases.get('v0.3.2604-beta1')?.assets.entries() ?? []),
  ].filter(([name]) => name.startsWith('ymax0-main-privateArgsOverrides-'));
  t.is(overridesAfterFirstRun.length, 1);
  const [firstOverridesName, firstOverridesText] = overridesAfterFirstRun[0];
  t.true(firstOverridesName.endsWith('.json'));
  t.is(firstOverridesText, '{\n  "oracle": "value-a"\n}\n');
  t.true(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );
  const walletAdminEvent = execs.find(
    event =>
      typeof event.command === 'string' &&
      event.command.includes('/wallet-admin.ts'),
  );
  t.deepEqual(walletAdminEvent?.env, {
    AGORIC_NET: 'main',
    MNEMONIC: 'control secret',
    PRIVATE_ARGS_OVERRIDES: '{"oracle":"value-a"}',
  });

  clearTrace({ execs, stdoutChunks });

  await t.throwsAsync(
    main(
      [
        'node',
        'packages/portfolio-deploy/scripts/ymax-deploy-target.ts',
        'phase-upgrade',
        ...flags({ target: 'ymax0-main', tag: 'v0.3.2604-beta1' }),
      ],
      { ...env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value-b"}' },
      {
        execFile: execFile as unknown as typeof import('execa').execa,
        agoricSdk,
        path,
        stdout,
      },
    ),
    {
      message: new RegExp(
        `^existing ymax0-main-upgrade\\.json uses ${firstOverridesName.replaceAll(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}, not ymax0-main-privateArgsOverrides-.*; remove or rename ymax0-main-upgrade\\.json to change private args$`,
      ),
    },
  );

  const overridesAfterSecondRun = [
    ...(releases.get('v0.3.2604-beta1')?.assets.entries() ?? []),
  ].filter(([name]) => name.startsWith('ymax0-main-privateArgsOverrides-'));
  t.is(overridesAfterSecondRun.length, 1);
  t.deepEqual(overridesAfterSecondRun, overridesAfterFirstRun);
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );
  t.deepEqual(stdoutChunks, []);
});

test.serial('deploy ymax1-main', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const { execFile: baseExecFile, files } = ctx;

  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
    if (cmd.endsWith('/wallet-admin.ts')) {
      if (args[0] === './packages/portfolio-deploy/src/ymax-upgrade.ts') {
        const event = makeExecEvent(ctx.normalize, cmd, args, opts);
        const resultText = `${JSON.stringify(
          {
            upgradeTxHash: 'UPMAIN1',
            upgradeBlockHeight: 81,
            upgradeBlockTime: '2026-04-16T12:10:00.000Z',
            bundleId: 'b1-abc123',
            healthBlocks: [
              { height: 82, hash: 'h82', time: 't82' },
              { height: 83, hash: 'h83', time: 't83' },
            ],
          },
          null,
          2,
        )}\n`;
        const resultFile = args[args.indexOf('--result-file') + 1];
        files.set(resultFile, resultText);
        event.stdout = '';
        ctx.execs.push(event);
        return { stdout: '' };
      }
      throw Error(`unexpected wallet-admin args: ${args.join(' ')}`);
    }
    const logResult = fakeUpgradeLogs(
      ctx.execs,
      ctx.normalize,
      cmd,
      args,
      opts,
      {
        contract: 'ymax1',
        bundleId: 'b1-abc123',
        incarnationNumber: 60,
      },
    );
    if (logResult) {
      return logResult;
    }

    return baseExecFile(cmd, args, opts, ...rest);
  };

  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-main-install.json': jsonText({
      ...examples.install.main0,
      releaseTag,
    }),
    'ymax0-main-upgrade.json': jsonText(examples.upgrade.main0),
  });

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile: baseExecFile,
      stdout: ctx.stdout,
    },
    'phase-pre-upgrade',
    { target: 'ymax1-main', tag: releaseTag },
    { ...ctx.env, AGORIC_NET: 'devnet' },
  );
  snapshotPhase(t, {
    label: 'pre-upgrade',
    execs: ctx.execs,
    normalize: ctx.normalize,
    stdoutChunks: ctx.stdoutChunks,
  });
  clearTrace(ctx);

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile,
      stdout: ctx.stdout,
    },
    'phase-upgrade',
    { target: 'ymax1-main', tag: releaseTag },
    { ...ctx.env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}' },
  );

  t.true(
    ctx.releases.get(releaseTag)?.assets.has('ymax1-main-upgrade.json') ??
      false,
  );
  snapshotPhase(t, {
    label: 'upgrade',
    execs: ctx.execs,
    normalize: ctx.normalize,
    stdoutChunks: ctx.stdoutChunks,
  });
  snapshotAssets(t, { releases: ctx.releases, releaseTag });
});

test('ymax1-main upgrade requires ymax0-main upgrade evidence', async t => {
  const { agoricSdk, releases, execs, stdoutChunks, stdout, env, execFile } =
    makeScenario();

  releases.set('v0.3.2604-beta1', {
    url: 'https://example.invalid/releases/v0.3.2604-beta1',
    assets: new Map([
      [
        'bundle-ymax0.json',
        `${JSON.stringify({ endoZipBase64Sha512: 'abc123' }, null, 2)}\n`,
      ],
      [
        'ymax0-main-install.json',
        `${JSON.stringify(
          {
            target: 'ymax0-main',
            contract: 'ymax0',
            network: 'main',
            chainId: 'agoric-3',
            bundleId: 'b1-abc123',
            installTxHash: 'TX123',
            installBlockHeight: 77,
            installBlockTime: '2026-04-16T12:00:00.000Z',
            confirmedInBundles: true,
          },
          null,
          2,
        )}\n`,
      ],
    ]),
  });

  await t.throwsAsync(
    runPhase(
      {
        agoricSdk,
        execFile,
        stdout,
      },
      'phase-upgrade',
      { target: 'ymax1-main', tag: 'v0.3.2604-beta1' },
      { ...env, MNEMONIC: 'not-used' },
    ),
    {
      message: 'missing required release asset ymax0-main-upgrade.json',
    },
  );
  t.deepEqual(stdoutChunks, []);
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );
});

test('phase-upgrade materializes default overrides', async t => {
  const { agoricSdk, files, releases, stdout, normalize, ...other } =
    makeScenario();
  const { env, execs, execFile: baseExecFile } = other;

  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
    const result = fakeYmaxUpgrade(execs, normalize, files, cmd, args, opts);
    if (result) {
      return result;
    }
    const logResult = fakeUpgradeLogs(execs, normalize, cmd, args, opts, {
      contract: 'ymax0',
      bundleId: 'b1-abc123',
      incarnationNumber: examples.upgrade.main0.incarnationNumber,
    });
    if (logResult) {
      return logResult;
    }
    return baseExecFile(cmd, args, opts, ...rest);
  };

  seedRelease(releases, 'v0.3.2604-beta1', {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  await runPhase(
    {
      agoricSdk,
      execFile,
      stdout,
    },
    'phase-upgrade',
    { target: 'ymax0-main', tag: 'v0.3.2604-beta1' },
    env,
  );

  const overridesAssets = [
    ...(releases.get('v0.3.2604-beta1')?.assets.entries() ?? []),
  ].filter(([name]) => name.startsWith('ymax0-main-privateArgsOverrides-'));
  t.is(overridesAssets.length, 1);
  t.is(overridesAssets[0]?.[1], '{}\n');
});
