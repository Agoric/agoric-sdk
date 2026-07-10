import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import path from 'node:path';

import { makeFileRW } from '@agoric/pola-io';
import {
  makeSignDoc as makeAminoSignDoc,
  pubkeyToAddress,
  serializeSignDoc,
} from '@cosmjs/amino';
import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';

import {
  canonicalizePrivateArgs,
  expectedOverridesAssetName,
  makeReleasePlan,
  validateNamedInstallRecord,
  validateNamedPendingUpgradeRecord,
  validateNamedUpgradeRecord,
} from '../src/ymax-release-policy.mjs';
import { toAminoMsg } from '../src/ymax-authz-msgs.ts';
import {
  main,
  makeGraph,
  validateUpgradePrecondition,
} from '../scripts/ymax-deploy-target.ts';

test('policy prerequisite checks are enforced', t => {
  const e = new Set<string>();
  t.throws(
    () =>
      validateNamedInstallRecord(e, 'ymax0-devnet', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-devnet-install.json' },
    'ymax0-main pre-upgrade requires ymax0-devnet install evidence',
  );
  t.throws(
    () =>
      validateNamedUpgradeRecord(e, 'ymax0-devnet', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-devnet-upgrade.json' },
    'ymax0-main pre-upgrade requires ymax0-devnet upgrade evidence',
  );
  t.throws(
    () =>
      validateNamedInstallRecord(e, 'ymax0-devnet', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-devnet-install.json' },
    'ymax0-main upgrade requires ymax0-devnet install evidence',
  );
  t.throws(
    () =>
      validateNamedUpgradeRecord(e, 'ymax0-devnet', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-devnet-upgrade.json' },
    'ymax0-main upgrade requires ymax0-devnet upgrade evidence',
  );
  t.throws(
    () => validateNamedInstallRecord(e, 'ymax0-main', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-main-install.json' },
    'ymax1-main pre-upgrade requires ymax0-main install evidence',
  );
  t.throws(
    () => validateNamedUpgradeRecord(e, 'ymax0-main', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-main-upgrade.json' },
    'ymax1-main pre-upgrade requires ymax0-main upgrade evidence',
  );
  t.throws(
    () => validateNamedInstallRecord(e, 'ymax0-main', 'b1-abc123', null as any),
    { message: 'missing required release asset ymax0-main-install.json' },
    'ymax1-main upgrade requires ymax0-main install evidence',
  );
});

test('policy evidence validation checks are enforced', t => {
  t.throws(
    () =>
      validateNamedInstallRecord(
        new Set(['ymax0-devnet-install.json']),
        'ymax0-devnet',
        'b1-abc123',
        {
          ...examples.install.devnet0,
          releaseTag: undefined,
          commit: undefined,
          bundleId: 'b1-wrong',
          installTxHash: 'TX123',
          installBlockHeight: 77,
          installBlockTime: '2026-04-16T12:00:00.000Z',
        } as any,
      ),
    { message: 'expected bundleId=b1-abc123, got b1-wrong' },
    'install evidence must match bundleId',
  );
  t.throws(
    () =>
      validateNamedInstallRecord(
        new Set(['ymax0-main-install.json']),
        'ymax0-main',
        'b1-abc123',
        {
          ...examples.install.main0,
          confirmedInBundles: false,
        } as any,
      ),
    { message: 'confirmedInBundles must be true' },
    'install evidence must prove bundle confirmation',
  );
  t.throws(
    () =>
      validateNamedUpgradeRecord(
        new Set(['ymax0-main-upgrade.json']),
        'ymax0-main',
        'b1-abc123',
        {
          ...examples.upgrade.main0,
          privateArgsOverridesPath: 'overrides.json',
          healthBlocks: [{ height: 1, hash: 'h1', time: 't1' }],
        } as any,
      ),
    { message: 'invalid upgrade record' },
    'upgrade evidence must validate proof',
  );
});

test('policy pending upgrade validation checks are enforced', t => {
  t.throws(
    () =>
      validateNamedPendingUpgradeRecord(
        new Set(['ymax0-main-upgrade-pending.json']),
        'ymax0-main',
        'b1-abc123',
        {
          ...examples.install.main0,
          privateArgsOverridesPath: expectedOverridesAssetName(
            'ymax0-main',
            '',
          ),
          releaseTag: 'v0.3.2604-beta1',
          invocationId: 'invocation-1',
          submitTime: '',
        } as any,
        '',
      ),
    { message: 'invalid pending upgrade record' },
  );
  t.throws(
    () =>
      validateNamedPendingUpgradeRecord(
        new Set(['ymax0-main-upgrade-pending.json']),
        'ymax0-main',
        'b1-abc123',
        {
          ...examples.install.main0,
          privateArgsOverridesPath: 'wrong.json',
          releaseTag: 'v0.3.2604-beta1',
          invocationId: 'invocation-1',
          submitTime: '2026-04-16T12:05:00.000Z',
        } as any,
        '{"a":1}',
      ),
    {
      message:
        /^existing ymax0-main-upgrade-pending\.json uses wrong\.json, not ymax0-main-privateArgsOverrides-.*; remove or rename ymax0-main-upgrade-pending\.json to change private args$/,
    },
    'a specified privateArgs mismatching the recorded path is rejected',
  );
  t.notThrows(
    () =>
      validateNamedPendingUpgradeRecord(
        new Set(['ymax0-main-upgrade-pending.json']),
        'ymax0-main',
        'b1-abc123',
        {
          ...examples.install.main0,
          privateArgsOverridesPath: 'wrong.json',
          releaseTag: 'v0.3.2604-beta1',
          invocationId: 'invocation-1',
          submitTime: '2026-04-16T12:05:00.000Z',
        } as any,
        '',
      ),
    "a blank privateArgs (workflow_dispatch's empty-string default) trusts the recorded path instead of re-deriving one to compare",
  );
  t.throws(
    () =>
      validateNamedPendingUpgradeRecord(
        new Set(['ymax0-main-upgrade-pending.json']),
        'ymax0-main',
        'b1-abc123',
        {
          ...examples.install.main0,
          privateArgsOverridesPath: expectedOverridesAssetName(
            'ymax0-main',
            '',
          ),
          releaseTag: 'v0.3.2604-beta2',
          invocationId: 'invocation-1',
          submitTime: '2026-04-16T12:05:00.000Z',
        } as any,
        '',
        'v0.3.2604-beta1',
      ),
    { message: 'expected releaseTag=v0.3.2604-beta1, got v0.3.2604-beta2' },
    'pending upgrade evidence must match the current release lineage',
  );
});

test('ymax1-main upgrade precondition requires ymax0-main upgrade asset', async t => {
  await t.throwsAsync(
    validateUpgradePrecondition('ymax0-main', 'b1-abc123', [], null as any),
    { message: 'missing required release asset ymax0-main-upgrade.json' },
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

const jsonText = (specimen: unknown) =>
  `${JSON.stringify(specimen, null, 2)}\n`;

const makePlanReader = (
  assets: Record<string, string>,
  releaseUrl = 'https://example.invalid/releases/v0.3.2604-beta1',
) => {
  const assetNames = new Set(Object.keys(assets));
  const getAssetText = (name: string) => {
    const text = assets[name];
    if (text === undefined) {
      throw Error(`missing required release asset ${name}`);
    }
    return text;
  };
  return {
    assetNames,
    getAssetText,
    getAssetJson: (name: string) => JSON.parse(getAssetText(name)),
    release: { url: releaseUrl },
  };
};

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

test('pending upgrade evidence suppresses submit but still requires confirm', t => {
  const releaseTag = happyPathReleaseTag;
  const privateArgs = '{"oracle":"value"}';
  const pending = {
    ...examples.install.main0,
    privateArgsOverridesPath: expectedOverridesAssetName(
      'ymax0-main',
      privateArgs,
    ),
    releaseTag,
    invocationId: 'invocation-1',
    submitTime: '2026-04-16T12:05:00.000Z',
  };
  const plan = makeReleasePlan({
    bundleIdArg: '',
    mode: 'deploy',
    privateArgs,
    reader: makePlanReader({
      'bundle-ymax0.json': jsonText(examples.bundle),
      'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
      'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
      'ymax0-main-install.json': jsonText(examples.install.main0),
      'ymax0-main-upgrade-pending.json': jsonText(pending),
    }),
    releaseTag,
    target: 'ymax0-main',
  });
  t.like(plan, {
    mode: 'deploy',
    target: 'ymax0-main',
    releaseTag,
    releaseExists: true,
    bundleId: 'b1-abc123',
    needBundleBuild: false,
    needPreUpgrade: false,
    needUpgradeSubmit: false,
    needUpgradeConfirm: true,
    needUpgrade: true,
  });
});

test('ymax1-main never needs pre-upgrade, even with no ymax1-main-install.json', t => {
  const releaseTag = happyPathReleaseTag;
  const plan = makeReleasePlan({
    bundleIdArg: '',
    mode: 'deploy',
    privateArgs: '',
    reader: makePlanReader({
      'bundle-ymax0.json': jsonText(examples.bundle),
      'ymax0-main-install.json': jsonText(examples.install.main0),
      'ymax0-main-upgrade.json': jsonText(examples.upgrade.main0),
    }),
    releaseTag,
    target: 'ymax1-main',
  });
  t.like(plan, {
    target: 'ymax1-main',
    needPreUpgrade: false,
  });
});

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
    label: 'pre-upgrade' | 'upgrade' | 'upgrade-submit';
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
    normalize,
    releases,
    releaseTag,
  }: {
    normalize: (value: unknown) => unknown;
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
          name === 'bundle-ymax0.json'
            ? '<bundle>'
            : name.endsWith('-upgrade-pending.json')
              ? `${JSON.stringify(
                  {
                    ...JSON.parse(text),
                    invocationId: normalize(
                      JSON.parse(text).invocationId,
                    ) as string,
                    submitTime: '<timestamp>',
                  },
                  null,
                  2,
                )}\n`
              : normalize(text),
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
      invocationId: args[args.indexOf('--invocation-id') + 1],
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
    typeof value === 'string'
      ? value
          .replaceAll(repoRoot, '<repo>')
          .replace(
            /upgrade\.(ymax[01]-(?:devnet|main))\.\d{4}-\d{2}-\d{2}T[^ \n"]+/g,
            'upgrade.$1.<timestamp>',
          )
      : value;
  const fetchFn = async (url: string) => {
    if (url.endsWith('/network-config')) {
      const network = url.includes('devnet.') ? 'devnet' : 'main';
      return {
        ok: true,
        status: 200,
        json: async () => ({
          chainName: network === 'devnet' ? 'agoricdev-25' : 'agoric-3',
          rpcAddrs: [`https://${network}.rpc.agoric.net:443`],
          apiAddrs: [`https://${network}.api.agoric.net:443`],
        }),
      } as Response;
    }
    const release = [...releases.values()][0];
    const pendingText =
      release?.assets.get('ymax0-devnet-upgrade-pending.json') ||
      release?.assets.get('ymax0-main-upgrade-pending.json') ||
      release?.assets.get('ymax1-main-upgrade-pending.json');
    if (!pendingText) {
      throw Error(`unexpected fetch before pending exists: ${url}`);
    }
    const pending = JSON.parse(pendingText) as {
      target: string;
      invocationId: string;
      bundleId: string;
      network: 'devnet' | 'main';
      contract: 'ymax0' | 'ymax1';
    };
    const payload =
      pending.target === 'ymax0-devnet'
        ? examples.upgrade.devnet0
        : examples.upgrade.main0;
    const sender =
      pending.network === 'devnet'
        ? 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv'
        : pending.contract === 'ymax1'
          ? 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928'
          : 'agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq';
    const messageId = `upgrade.${payload.upgradeBlockTime}`;
    const tx = {
      height: `${payload.upgradeBlockHeight}`,
      txhash: payload.upgradeTxHash,
      code: 0,
      timestamp: payload.upgradeBlockTime,
      tx: {
        body: {
          messages: [
            {
              '@type': '/agoric.swingset.MsgWalletSpendAction',
              owner: sender,
              spend_action: JSON.stringify({
                body: `#${JSON.stringify({
                  method: 'invokeEntry',
                  message: {
                    id: messageId,
                    method: 'upgrade',
                    args: [{ bundleId: pending.bundleId }],
                  },
                })}`,
              }),
            },
          ],
        },
      },
    };
    // fetchJsonResilient reads the body via text(), so provide both.
    const jsonRes = (data: unknown) =>
      ({
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data),
      }) as Response;
    if (url.includes('/cosmos/tx/v1beta1/txs?')) {
      return jsonRes({ tx_responses: [tx] });
    }
    if (url.includes('/cosmos/tx/v1beta1/txs/')) {
      return jsonRes({ tx_response: tx });
    }
    if (url.includes(`/agoric/vstorage/data/published.wallet.${sender}`)) {
      const update = {
        body: `#${JSON.stringify({
          updated: 'invocation',
          id: messageId,
          result: { incarnationNumber: payload.incarnationNumber },
        })}`,
        slots: [],
      };
      return jsonRes({
        value: JSON.stringify({
          blockHeight: tx.height,
          values: [JSON.stringify(update)],
        }),
      });
    }
    if (url.includes('/cosmos/base/tendermint/v1beta1/blocks/')) {
      const height = Number(url.split('/').pop());
      return jsonRes({
        block_id: {
          hash: Buffer.from(`block-hash-${height}`).toString('base64'),
        },
        block: {
          header: {
            height: `${height}`,
            time: new Date(height * 1000).toISOString(),
          },
        },
      });
    }
    throw Error(`unexpected fetch url: ${url}`);
  };
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
    fetchFn,
  };
};

const runPhase = async (
  {
    agoricSdk,
    execFile,
    fetchFn,
    stdout,
    connectRpc,
    makeWalletKit,
  }: Pick<
    ReturnType<typeof makeScenario>,
    'agoricSdk' | 'execFile' | 'fetchFn' | 'stdout'
  > & {
    connectRpc?: typeof import('@cosmjs/stargate').StargateClient.connect;
    makeWalletKit?: typeof import('@agoric/client-utils').makeSmartWalletKit;
  },
  phase:
    | 'phase-pre-upgrade'
    | 'phase-upgrade-generate'
    | 'phase-upgrade-submit'
    | 'phase-upgrade-confirm',
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
      fetchFn,
      connectRpc,
      makeWalletKit,
      path,
      stdout,
      // Deterministic submit clock, before the example upgrade block times,
      // so confirm's submitTime window accepts the fixture txs.
      now: () => Date.parse('2026-04-16T10:00:00.000Z'),
    },
  );

const clearTrace = ({
  execs,
  stdoutChunks,
}: Pick<ReturnType<typeof makeScenario>, 'execs' | 'stdoutChunks'>) => {
  execs.length = 0;
  stdoutChunks.length = 0;
};

const renderGraphTree = (
  nodes: ReturnType<typeof makeGraph>['nodes'],
  root: string,
): string => {
  const expanded = new Set<string>();
  const visit = (
    name: string,
    prefix: string,
    branch: string,
    ancestors: Set<string>,
  ): string[] => {
    const cycle = ancestors.has(name);
    const line = `${prefix}${branch}${name}${cycle ? ' (cycle)' : ''}`;
    if (cycle) {
      return [line];
    }
    if (expanded.has(name)) {
      return [`${prefix}${branch}${name} (seen)`];
    }
    expanded.add(name);
    const deps = Object.values(nodes[name]?.deps || {});
    return [
      line,
      ...deps.flatMap((dep, index) =>
        visit(
          dep,
          `${prefix}${branch === '└─ ' ? '   ' : branch === '├─ ' ? '│  ' : ''}`,
          index === deps.length - 1 ? '└─ ' : '├─ ',
          new Set([...ancestors, name]),
        ),
      ),
    ];
  };
  return visit(root, '', '', new Set()).join('\n');
};

test('devnet graph shows github-sign and operator-sign paths', t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const sharedGraphOptions = {
    deployPackage: {
      distDir: ctx.agoricSdk.join('packages/portfolio-deploy/dist'),
      bundleFile: ctx.agoricSdk.join(
        'packages/portfolio-deploy/dist/bundle-ymax0.json',
      ),
    },
    release: null,
    installBundle: null,
    upgradeLogs: null,
    walletAdmin: null,
    connectTargetRpc: async () => assert.fail('mock'),
    makeUpgradeRequestBuilder: async () => assert.fail('mock'),
    makeTxApiForTarget: async () => assert.fail('mock'),
    makeVstorageApiForTarget: async () => assert.fail('mock'),
    setTimeout: () => assert.fail('mock'),
    now: () => Date.parse('2026-04-16T10:00:00.000Z'),
    grantee: 'agoric1operator0000000000000000000000000000000',
  } as unknown as Parameters<typeof makeGraph>[6];
  const githubGraph = makeGraph(
    'ymax0-devnet',
    releaseTag,
    undefined,
    '',
    '{"oracle":"value"}',
    false,
    sharedGraphOptions,
  );
  const operatorGraph = makeGraph(
    'ymax0-devnet',
    releaseTag,
    undefined,
    '',
    '{"oracle":"value"}',
    true,
    sharedGraphOptions,
  );
  t.snapshot(
    renderGraphTree(githubGraph.nodes, 'ymax0-devnet-upgrade.json'),
    'ymax0-devnet github-sign graph',
  );
  t.snapshot(
    renderGraphTree(operatorGraph.nodes, 'ymax0-devnet-authz-unsigned-tx.json'),
    'ymax0-devnet operator-sign generate graph',
  );
  t.snapshot(
    renderGraphTree(operatorGraph.nodes, 'ymax0-devnet-upgrade.json'),
    'ymax0-devnet operator-sign confirm graph',
  );
});

test('ymax0-devnet phase-upgrade-submit does not require local bundle', async t => {
  const {
    agoricSdk,
    files,
    releases,
    stdout,
    env,
    execs,
    normalize,
    fetchFn,
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
      fetchFn,
      stdout,
    },
    'phase-upgrade-submit',
    { target: 'ymax0-devnet', tag: releaseTag },
    {
      ...env,
      AGORIC_NET: 'devnet',
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  t.truthy(
    releases.get(releaseTag)?.assets.has('ymax0-devnet-upgrade-pending.json'),
  );
  t.falsy(
    releases.get(releaseTag)?.assets.has('ymax0-devnet-upgrade-submit.json'),
  );
  t.false(releases.get(releaseTag)?.assets.has('ymax0-devnet-upgrade.json'));
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
    fetchFn,
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
        fetchFn,
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
    { message: 'missing local bundle-ymax0.json' },
  );

  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('gh release upload') &&
        event.command.includes('#bundle-ymax0.json'),
    ),
  );
  t.falsy(releases.get(releaseTag)?.assets.has('ymax0-devnet-install.json'));
  t.deepEqual(stdoutChunks, []);
});

test('reject ymax1-main upgrade without ymax0-main upgrade evidence', async t => {
  const {
    agoricSdk,
    releases,
    execs,
    stdoutChunks,
    stdout,
    env,
    fetchFn,
    execFile,
  } = makeScenario();

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
        'phase-upgrade-submit',
        ...flags({ target: 'ymax1-main', tag: 'v0.3.2604-beta1' }),
      ],
      {
        ...env,
        MNEMONIC: 'not-used',
      },
      {
        execFile: execFile as unknown as typeof import('execa').execa,
        agoricSdk,
        fetchFn,
        path,
        stdout,
      },
    ),
    { message: 'missing required release asset ymax0-main-install.json' },
  );
  t.deepEqual(stdoutChunks, []);
  t.false(
    execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );

  const releaseTag = happyPathReleaseTag;
  t.throws(
    () =>
      makeReleasePlan({
        bundleIdArg: '',
        mode: 'deploy',
        privateArgs: '',
        reader: makePlanReader({
          'bundle-ymax0.json': jsonText(examples.bundle),
        }),
        releaseTag,
        target: 'ymax1-main',
      }),
    { message: 'missing required release asset ymax0-main-install.json' },
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
      fetchFn: ctx.fetchFn,
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
      fetchFn: ctx.fetchFn,
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
      fetchFn: ctx.fetchFn,
      stdout: ctx.stdout,
    },
    'phase-upgrade-submit',
    { target: 'ymax0-main', tag: releaseTag },
    { ...ctx.env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}' },
  );

  t.truthy(ctx.releases.get(releaseTag)?.assets.has('ymax0-main-install.json'));
  t.truthy(
    ctx.releases.get(releaseTag)?.assets.has('ymax0-main-upgrade-pending.json'),
  );
  t.false(ctx.releases.get(releaseTag)?.assets.has('ymax0-main-upgrade.json'));
  snapshotPhase(t, {
    label: 'upgrade-submit',
    execs: ctx.execs,
    normalize: ctx.normalize,
    stdoutChunks: ctx.stdoutChunks,
  });
  snapshotAssets(t, {
    normalize: ctx.normalize,
    releases: ctx.releases,
    releaseTag,
  });
});

test('existing invalid step record fails hard instead of being overwritten', async t => {
  const {
    agoricSdk,
    releases,
    execs,
    stdoutChunks,
    stdout,
    env,
    fetchFn,
    execFile,
  } = makeScenario();

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
        fetchFn,
        path,
        stdout,
      },
    ),
    { message: 'confirmedInBundles must be true' },
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

test('authz operator-sign path generates and broadcasts for ymax0-main', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const broadcastCalls: Uint8Array[] = [];
  const { execFile: baseExecFile } = ctx;

  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
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
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  const connectRpc = (async (_rpcAddr: string) => ({
    getAccount: async () => ({
      accountNumber: 12,
      sequence: 34,
      pubkey: {
        type: 'tendermint/PubKeySecp256k1',
        value: Buffer.from([2, 3, 4]).toString('base64'),
      },
    }),
    broadcastTx: async (txBytes: Uint8Array) => {
      broadcastCalls.push(txBytes);
      return {
        transactionHash: 'AUTHZSUBMIT123',
        height: 91,
      };
    },
  })) as unknown as typeof import('@cosmjs/stargate').StargateClient.connect;
  const makeWalletKit = async () =>
    ({
      marshaller: {
        toCapData: (specimen: unknown) => ({
          body: `#${JSON.stringify(specimen)}`,
          slots: [],
        }),
      },
      agoricNames: {
        instance: {
          postalService: 'board0371',
        },
      },
    }) as unknown as Awaited<
      ReturnType<typeof import('@agoric/client-utils').makeSmartWalletKit>
    >;
  const graph = makeGraph(
    'ymax0-main',
    releaseTag,
    undefined,
    '',
    '{"oracle":"value"}',
    true,
    {
      deployPackage: {
        distDir: ctx.agoricSdk.join('packages/portfolio-deploy/dist'),
        bundleFile: ctx.agoricSdk.join(
          'packages/portfolio-deploy/dist/bundle-ymax0.json',
        ),
      },
      walletAdmin: null,
      connectTargetRpc: async () => assert.fail('mock'),
      makeUpgradeRequestBuilder: async () => assert.fail('mock'),
      makeTxApiForTarget: async () => assert.fail('mock'),
      makeVstorageApiForTarget: async () => assert.fail('mock'),
      setTimeout: () => assert.fail('mock'),
      now: () => Date.parse('2026-04-16T10:00:00.000Z'),
      grantee: 'agoric1operator0000000000000000000000000000000',
    } as unknown as Parameters<typeof makeGraph>[6],
  );
  t.snapshot(
    renderGraphTree(graph.nodes, 'ymax0-main-upgrade.json'),
    'ymax0-main-upgrade.json graph',
  );

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-generate',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: 'agoric1operator0000000000000000000000000000000',
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  const assets = ctx.releases.get(releaseTag)?.assets;
  t.falsy(assets?.get('ymax0-main-upgrade-pending.json'));
  t.truthy(assets?.get('ymax0-main-authz-unsigned-tx.json'));
  t.snapshot(
    JSON.parse(assets?.get('ymax0-main-authz-unsigned-tx.json') || 'null'),
    'ymax0-main authz unsigned tx',
  );
  t.false(
    ctx.execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
  );

  t.like(JSON.parse(ctx.stdoutChunks[0]), {
    target: 'ymax0-main',
    phase: 'upgrade-generate',
    record: 'ymax0-main-authz-unsigned-tx.json',
    detail: {
      agdSignCommand:
        "agd tx sign 'ymax0-main-authz-unsigned-tx.json' --offline --sign-mode direct --from 'agoric1operator0000000000000000000000000000000' --account-number 12 --sequence 34 --chain-id 'agoric-3' --overwrite --output-document 'ymax0-main-authz-signed-tx.json'",
      unsignedTxAssetName: 'ymax0-main-authz-unsigned-tx.json',
      pending: {
        bundleId: 'b1-abc123',
      },
    },
  });
  clearTrace(ctx);

  const unsignedTx = JSON.parse(
    assets?.get('ymax0-main-authz-unsigned-tx.json') || 'null',
  );
  const signedTx = {
    ...unsignedTx,
    auth_info: {
      ...unsignedTx.auth_info,
      signer_infos: [
        {
          ...unsignedTx.auth_info.signer_infos[0],
          public_key: {
            '@type': '/cosmos.crypto.secp256k1.PubKey',
            key: Buffer.from([2, 3, 4]).toString('base64'),
          },
        },
      ],
    },
    signatures: [Buffer.from([7, 8, 9]).toString('base64')],
  };
  assets?.set(
    'ymax0-main-authz-signed-tx.json',
    `${JSON.stringify(signedTx, null, 2)}\n`,
  );
  t.snapshot(signedTx, 'ymax0-main authz signed tx');

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-submit',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: 'agoric1operator0000000000000000000000000000000',
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  t.is(broadcastCalls.length, 1);
  const submitReport = JSON.parse(ctx.stdoutChunks[0]);
  t.is(submitReport.target, 'ymax0-main');
  t.is(submitReport.phase, 'upgrade-submit');
  t.is(submitReport.record, 'ymax0-main-upgrade-pending.json');
  t.is(submitReport.detail.bundleId, 'b1-abc123');
  t.is(
    submitReport.detail.invocationId,
    'upgrade.ymax0-main.2026-04-16T10:00:00.000Z',
  );
  t.truthy(assets?.get('ymax0-main-upgrade-pending.json'));
  t.true(
    String(submitReport.detail.privateArgsOverridesPath).startsWith(
      'ymax0-main-privateArgsOverrides-',
    ),
  );
  t.falsy(assets?.has('ymax0-main-upgrade-submit.json'));
  t.falsy(assets?.has('ymax0-main-upgrade.json'));
});

test('phase-upgrade-submit records the invocationId embedded in the detached tx, not a fresh one', async t => {
  // A detached tx can be generated well before it's broadcast (while
  // cosigners collect signatures), so submit-time `now()` must NOT be used
  // to derive the invocationId recorded in the pending record — it has to
  // come from what's actually embedded in the tx being broadcast.
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const broadcastCalls: Uint8Array[] = [];
  const { execFile: baseExecFile } = ctx;
  const grantee = 'agoric1operator0000000000000000000000000000000';
  const generateTime = '2026-04-16T10:00:00.000Z';
  const submitTime = '2026-04-20T15:30:00.000Z';

  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
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
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  const connectRpc = (async (_rpcAddr: string) => ({
    getAccount: async () => ({
      accountNumber: 12,
      sequence: 34,
      pubkey: {
        type: 'tendermint/PubKeySecp256k1',
        value: Buffer.from([2, 3, 4]).toString('base64'),
      },
    }),
    broadcastTx: async (txBytes: Uint8Array) => {
      broadcastCalls.push(txBytes);
      return { transactionHash: 'AUTHZSUBMIT456', height: 91 };
    },
  })) as unknown as typeof import('@cosmjs/stargate').StargateClient.connect;
  const makeWalletKit = async () =>
    ({
      marshaller: {
        toCapData: (specimen: unknown) => ({
          body: `#${JSON.stringify(specimen)}`,
          slots: [],
        }),
      },
      agoricNames: { instance: { postalService: 'board0371' } },
    }) as unknown as Awaited<
      ReturnType<typeof import('@agoric/client-utils').makeSmartWalletKit>
    >;

  await main(
    [
      'node',
      'packages/portfolio-deploy/scripts/ymax-deploy-target.ts',
      'phase-upgrade-generate',
      ...flags({ target: 'ymax0-main', tag: releaseTag }),
    ],
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: grantee,
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
    {
      execFile: execFile as unknown as typeof import('execa').execa,
      agoricSdk: ctx.agoricSdk,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      path,
      stdout: ctx.stdout,
      now: () => Date.parse(generateTime),
    },
  );
  const expectedInvocationId = `upgrade.ymax0-main.${generateTime}`;

  const assets = ctx.releases.get(releaseTag)?.assets;
  const unsignedTx = JSON.parse(
    assets?.get('ymax0-main-authz-unsigned-tx.json') || 'null',
  );
  const spendAction = JSON.parse(
    unsignedTx.body.messages[0].msgs[0].spend_action,
  );
  const embeddedAction = JSON.parse(spendAction.body.replace(/^#/, ''));
  t.is(embeddedAction.message.id, expectedInvocationId);
  clearTrace(ctx);

  const signedTx = {
    ...unsignedTx,
    auth_info: {
      ...unsignedTx.auth_info,
      signer_infos: [
        {
          ...unsignedTx.auth_info.signer_infos[0],
          public_key: {
            '@type': '/cosmos.crypto.secp256k1.PubKey',
            key: Buffer.from([2, 3, 4]).toString('base64'),
          },
        },
      ],
    },
    signatures: [Buffer.from([7, 8, 9]).toString('base64')],
  };
  assets?.set(
    'ymax0-main-authz-signed-tx.json',
    `${JSON.stringify(signedTx, null, 2)}\n`,
  );

  await main(
    [
      'node',
      'packages/portfolio-deploy/scripts/ymax-deploy-target.ts',
      'phase-upgrade-submit',
      ...flags({ target: 'ymax0-main', tag: releaseTag }),
    ],
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: grantee,
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
    {
      execFile: execFile as unknown as typeof import('execa').execa,
      agoricSdk: ctx.agoricSdk,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      path,
      stdout: ctx.stdout,
      now: () => Date.parse(submitTime),
    },
  );

  t.is(broadcastCalls.length, 1);
  const submitReport = JSON.parse(ctx.stdoutChunks[0]);
  t.is(submitReport.detail.invocationId, expectedInvocationId);
  t.not(submitReport.detail.invocationId, `upgrade.ymax0-main.${submitTime}`);
  t.is(submitReport.detail.submitTime, submitTime);
});

test('authz operator-sign path embeds a multisig grantee pubkey resolved from chain', async t => {
  // Regression test: `agd tx multisign` panics with a nil pointer
  // dereference if the unsigned tx's placeholder signer_info has no
  // public_key, which is the case whenever the grantee is a multisig
  // account (agd tx multisign is only needed for multisig grantees). The
  // grantee is given as a bare address; its public key is resolved from
  // the (mocked) on-chain account, as it would be for a multisig that has
  // transacted at least once before.
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const grantee = 'agoric1operator0000000000000000000000000000000';
  const granteePubkey = {
    '@type': '/cosmos.crypto.multisig.LegacyAminoPubKey',
    threshold: 2,
    public_keys: [
      {
        '@type': '/cosmos.crypto.secp256k1.PubKey',
        key: 'A43NKCA60Po/kXiKIsA2CKVERUMsRnRsmEB1T4pnHgS3',
      },
      {
        '@type': '/cosmos.crypto.secp256k1.PubKey',
        key: 'Azb3Hn7YJIsE0NAnSN1HNnRQ/CQ8rQiJpxA1Bo8LS3bl',
      },
    ],
  };
  const granteePubkeyAmino = {
    type: 'tendermint/PubKeyMultisigThreshold',
    value: {
      threshold: '2',
      pubkeys: granteePubkey.public_keys.map(pk => ({
        type: 'tendermint/PubKeySecp256k1',
        value: pk.key,
      })),
    },
  };

  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  const connectRpc = (async (_rpcAddr: string) => ({
    getAccount: async () => ({
      accountNumber: 12,
      sequence: 34,
      pubkey: granteePubkeyAmino,
    }),
  })) as unknown as typeof import('@cosmjs/stargate').StargateClient.connect;
  const makeWalletKit = async () =>
    ({
      marshaller: {
        toCapData: (specimen: unknown) => ({
          body: `#${JSON.stringify(specimen)}`,
          slots: [],
        }),
      },
      agoricNames: {
        instance: {
          postalService: 'board0371',
        },
      },
    }) as unknown as Awaited<
      ReturnType<typeof import('@agoric/client-utils').makeSmartWalletKit>
    >;

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile: ctx.execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-generate',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: grantee,
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  const assets = ctx.releases.get(releaseTag)?.assets;
  const unsignedTx = JSON.parse(
    assets?.get('ymax0-main-authz-unsigned-tx.json') || 'null',
  );
  t.deepEqual(unsignedTx.auth_info.signer_infos[0].public_key, granteePubkey);

  // Regression test: for a multisig grantee, the printed agd command must
  // have each cosigner sign individually with --multisig=... (amino-json,
  // only the multisig's own pubkey imported first) rather than the
  // single-key --sign-mode direct command, which agd rejects outright for
  // a multisig signer (confirmed against a real agd binary). The local
  // keyring name is derived from the grantee's own address (last 8 chars),
  // not the target, so the same recurring grantee reuses one entry across
  // every target/release instead of colliding or duplicating per target.
  t.is(
    JSON.parse(ctx.stdoutChunks[0]!).detail.agdSignCommand,
    'agd keys add \'ymax-grantee-00000000\' --pubkey=\'{"@type":"/cosmos.crypto.multisig.LegacyAminoPubKey","threshold":2,"public_keys":[{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"A43NKCA60Po/kXiKIsA2CKVERUMsRnRsmEB1T4pnHgS3"},{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"Azb3Hn7YJIsE0NAnSN1HNnRQ/CQ8rQiJpxA1Bo8LS3bl"}]}\'\nagd tx sign \'ymax0-main-authz-unsigned-tx.json\' --offline --sign-mode amino-json --multisig=ymax-grantee-00000000 --from <your-key-name> --account-number 12 --sequence 34 --chain-id \'agoric-3\' --overwrite --output-document \'ymax0-main-authz-signature-<your-name>.json\'',
  );
});

test('phase-upgrade-generate combines detached-grantee signature files into the signed tx', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;

  // Two synthetic member keys (not real agd-managed keys) so the test can
  // sign for them directly; ymax-multisign-agd.test.ts already proves the
  // verification logic matches real `agd tx sign` output byte-for-byte.
  const memberPrivkeys = [
    Uint8Array.from({ length: 32 }, (_v, i) => i + 1),
    Uint8Array.from({ length: 32 }, (_v, i) => i + 33),
  ];
  const memberKeypairs = await Promise.all(
    memberPrivkeys.map(privkey => Secp256k1.makeKeypair(privkey)),
  );
  const memberPubkeysCompressed = memberKeypairs.map(({ pubkey }) =>
    Secp256k1.compressPubkey(pubkey),
  );
  const granteePubkeyJson = {
    '@type': '/cosmos.crypto.multisig.LegacyAminoPubKey',
    threshold: 2,
    public_keys: memberPubkeysCompressed.map(key => ({
      '@type': '/cosmos.crypto.secp256k1.PubKey',
      key: Buffer.from(key).toString('base64'),
    })),
  };
  const granteePubkeyAmino = {
    type: 'tendermint/PubKeyMultisigThreshold',
    value: {
      threshold: '2',
      pubkeys: memberPubkeysCompressed.map(key => ({
        type: 'tendermint/PubKeySecp256k1',
        value: Buffer.from(key).toString('base64'),
      })),
    },
  };
  // A real chain guarantees this address decodes back to granteePubkeyAmino;
  // deriving it the same way keeps this mock internally consistent (rather
  // than an arbitrary placeholder the mocked getAccount ignores anyway).
  const grantee = pubkeyToAddress(granteePubkeyAmino, 'agoric');
  const accountNumber = 55;
  const sequence = 6;

  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  const connectRpc = (async (_rpcAddr: string) => ({
    getAccount: async () => ({
      accountNumber,
      sequence,
      pubkey: granteePubkeyAmino,
    }),
  })) as unknown as typeof import('@cosmjs/stargate').StargateClient.connect;
  const makeWalletKit = async () =>
    ({
      marshaller: {
        toCapData: (specimen: unknown) => ({
          body: `#${JSON.stringify(specimen)}`,
          slots: [],
        }),
      },
      agoricNames: { instance: { postalService: 'board0371' } },
    }) as unknown as Awaited<
      ReturnType<typeof import('@agoric/client-utils').makeSmartWalletKit>
    >;

  const generate = () =>
    runPhase(
      {
        agoricSdk: ctx.agoricSdk,
        execFile: ctx.execFile,
        fetchFn: ctx.fetchFn,
        connectRpc,
        makeWalletKit,
        stdout: ctx.stdout,
      },
      'phase-upgrade-generate',
      { target: 'ymax0-main', tag: releaseTag },
      {
        ...ctx.env,
        MNEMONIC: undefined,
        GRANTEE: grantee,
        PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
      },
    );

  await generate();
  t.deepEqual(JSON.parse(ctx.stdoutChunks.at(-1)!).readyToBroadcast, false);
  t.deepEqual(
    JSON.parse(ctx.stdoutChunks.at(-1)!).reason,
    'no detached signatures uploaded yet',
  );
  clearTrace(ctx);

  const assets = ctx.releases.get(releaseTag)?.assets!;
  const unsignedTx = JSON.parse(
    assets.get('ymax0-main-authz-unsigned-tx.json')!,
  );
  t.deepEqual(
    unsignedTx.auth_info.signer_infos[0].public_key,
    granteePubkeyJson,
  );

  const digest = sha256(
    serializeSignDoc(
      makeAminoSignDoc(
        unsignedTx.body.messages.map((message: any) => toAminoMsg(message)),
        {
          amount: unsignedTx.auth_info.fee.amount,
          gas: unsignedTx.auth_info.fee.gas_limit,
        },
        'agoric-3',
        unsignedTx.body.memo || '',
        accountNumber,
        sequence,
      ),
    ),
  );
  const signatureAssetFor = async (keypair: {
    privkey: Uint8Array;
    pubkey: Uint8Array;
  }) => {
    const signature = await Secp256k1.createSignature(digest, keypair.privkey);
    // ExtendedSecp256k1Signature.toFixedLength() appends a recovery byte
    // (65 bytes); cosmos-sdk stores plain 64-byte r||s, matching
    // Secp256k1Signature.fromFixedLength/toFixedLength.
    const fixedLengthSignature = new Secp256k1Signature(
      signature.r(32),
      signature.s(32),
    ).toFixedLength();
    return jsonText({
      signatures: [
        {
          public_key: {
            '@type': '/cosmos.crypto.secp256k1.PubKey',
            key: Buffer.from(Secp256k1.compressPubkey(keypair.pubkey)).toString(
              'base64',
            ),
          },
          data: {
            single: {
              mode: 'SIGN_MODE_LEGACY_AMINO_JSON',
              signature: Buffer.from(fixedLengthSignature).toString('base64'),
            },
          },
          sequence: String(sequence),
        },
      ],
    });
  };

  assets.set(
    'ymax0-main-authz-signature-alice.json',
    await signatureAssetFor(memberKeypairs[0]!),
  );
  await generate();
  t.deepEqual(JSON.parse(ctx.stdoutChunks.at(-1)!).readyToBroadcast, false);
  t.deepEqual(
    JSON.parse(ctx.stdoutChunks.at(-1)!).reason,
    '1 of 2 required signatures collected',
  );
  t.falsy(assets.get('ymax0-main-authz-signed-tx.json'));
  clearTrace(ctx);

  assets.set(
    'ymax0-main-authz-signature-bob.json',
    await signatureAssetFor(memberKeypairs[1]!),
  );
  await generate();
  t.deepEqual(JSON.parse(ctx.stdoutChunks.at(-1)!).readyToBroadcast, true);
  const signedTxText = assets.get('ymax0-main-authz-signed-tx.json');
  t.truthy(signedTxText);
  const signedTx = JSON.parse(signedTxText!);
  t.is(signedTx.signatures.length, 1);
  t.deepEqual(signedTx.body, unsignedTx.body);
});

test('detached direct-sign path generates and broadcasts for ymax0-main without authz', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;
  const broadcastCalls: Uint8Array[] = [];
  const { execFile: baseExecFile } = ctx;
  const graph = makeGraph(
    'ymax0-main',
    releaseTag,
    undefined,
    '',
    '{"oracle":"value"}',
    true,
    {
      deployPackage: {
        distDir: ctx.agoricSdk.join('packages/portfolio-deploy/dist'),
        bundleFile: ctx.agoricSdk.join(
          'packages/portfolio-deploy/dist/bundle-ymax0.json',
        ),
      },
      release: null,
      installBundle: null,
      upgradeLogs: null,
      walletAdmin: null,
      connectTargetRpc: async () => assert.fail('mock'),
      makeUpgradeRequestBuilder: async () => assert.fail('mock'),
      makeTxApiForTarget: async () => assert.fail('mock'),
      makeVstorageApiForTarget: async () => assert.fail('mock'),
      setTimeout: () => assert.fail('mock'),
      now: () => Date.parse('2026-04-16T10:00:00.000Z'),
      grantee: undefined,
    } as unknown as Parameters<typeof makeGraph>[6],
  );
  t.snapshot(
    renderGraphTree(graph.nodes, 'ymax0-main-upgrade.json'),
    'ymax0-main direct-sign confirm graph',
  );

  const execFile = async (
    cmd: string,
    args: string[],
    opts?: Parameters<typeof baseExecFile>[2],
    ...rest: unknown[]
  ) => {
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
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  const connectRpc = (async (_rpcAddr: string) => ({
    getAccount: async () => ({
      accountNumber: 12,
      sequence: 34,
      pubkey: null,
    }),
    broadcastTx: async (txBytes: Uint8Array) => {
      broadcastCalls.push(txBytes);
      return {
        transactionHash: 'DIRECTSUBMIT123',
        height: 91,
      };
    },
  })) as unknown as typeof import('@cosmjs/stargate').StargateClient.connect;
  const makeWalletKit = async () =>
    ({
      marshaller: {
        toCapData: (specimen: unknown) => ({
          body: `#${JSON.stringify(specimen)}`,
          slots: [],
        }),
      },
      agoricNames: {
        instance: {
          postalService: 'board0371',
        },
      },
    }) as unknown as Awaited<
      ReturnType<typeof import('@agoric/client-utils').makeSmartWalletKit>
    >;

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-generate',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: undefined,
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  const assets = ctx.releases.get(releaseTag)?.assets;
  t.falsy(assets?.get('ymax0-main-upgrade-pending.json'));
  t.truthy(assets?.get('ymax0-main-unsigned-tx.json'));
  t.falsy(assets?.get('ymax0-main-authz-unsigned-tx.json'));

  const unsignedTx = JSON.parse(
    assets?.get('ymax0-main-unsigned-tx.json') || 'null',
  );
  t.is(
    unsignedTx.body.messages[0]['@type'],
    '/agoric.swingset.MsgWalletSpendAction',
  );
  t.truthy(unsignedTx.body.messages[0].owner);
  t.like(JSON.parse(ctx.stdoutChunks[0]), {
    target: 'ymax0-main',
    phase: 'upgrade-generate',
    record: 'ymax0-main-unsigned-tx.json',
    detail: {
      agdSignCommand:
        "agd tx sign 'ymax0-main-unsigned-tx.json' --offline --sign-mode direct --from 'agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq' --account-number 12 --sequence 34 --chain-id 'agoric-3' --overwrite --output-document 'ymax0-main-signed-tx.json'",
      unsignedTxAssetName: 'ymax0-main-unsigned-tx.json',
      pending: {
        bundleId: 'b1-abc123',
      },
    },
  });
  clearTrace(ctx);

  const signedTx = {
    ...unsignedTx,
    auth_info: {
      ...unsignedTx.auth_info,
      signer_infos: [
        {
          ...unsignedTx.auth_info.signer_infos[0],
          public_key: {
            '@type': '/cosmos.crypto.secp256k1.PubKey',
            key: Buffer.from([2, 3, 4]).toString('base64'),
          },
        },
      ],
    },
    signatures: [Buffer.from([7, 8, 9]).toString('base64')],
  };
  assets?.set(
    'ymax0-main-signed-tx.json',
    `${JSON.stringify(signedTx, null, 2)}\n`,
  );

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-submit',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: undefined,
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  t.is(broadcastCalls.length, 1);
  const submitReport = JSON.parse(ctx.stdoutChunks[0]);
  t.is(submitReport.target, 'ymax0-main');
  t.is(submitReport.phase, 'upgrade-submit');
  t.is(submitReport.record, 'ymax0-main-upgrade-pending.json');
  t.is(submitReport.detail.bundleId, 'b1-abc123');
  t.truthy(assets?.get('ymax0-main-upgrade-pending.json'));
  t.falsy(assets?.has('ymax0-main-upgrade-submit.json'));
  t.falsy(assets?.has('ymax0-main-upgrade.json'));
  t.false(
    ctx.execs.some(
      event =>
        typeof event.command === 'string' &&
        event.command.includes('/wallet-admin.ts'),
    ),
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
    fetchFn,
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
      fetchFn,
      stdout,
    },
    'phase-upgrade-submit',
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
        'phase-upgrade-submit',
        ...flags({ target: 'ymax0-main', tag: 'v0.3.2604-beta1' }),
      ],
      { ...env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value-b"}' },
      {
        execFile: execFile as unknown as typeof import('execa').execa,
        agoricSdk,
        fetchFn,
        path,
        stdout,
      },
    ),
    {
      message: new RegExp(
        `^existing ymax0-main-upgrade(?:-pending)?\\.json uses ${firstOverridesName.replaceAll(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}, not ymax0-main-privateArgsOverrides-.*; remove or rename ymax0-main-upgrade(?:-pending)?\\.json to change private args$`,
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

const makeAuthzGenerateChainMocks = (
  // Not a cryptographically valid key, just the right shape (33 bytes,
  // compressed-prefix byte) — enough for pubkeyToAddress, which most tests
  // never exercise since they don't decode the embedded pubkey back out.
  pubkeyValue = Buffer.from([2, 3, 4]).toString('base64'),
) => {
  const connectRpc = (async (_rpcAddr: string) => ({
    getAccount: async () => ({
      accountNumber: 12,
      sequence: 34,
      pubkey: {
        type: 'tendermint/PubKeySecp256k1',
        value: pubkeyValue,
      },
    }),
  })) as unknown as typeof import('@cosmjs/stargate').StargateClient.connect;
  const makeWalletKit = async () =>
    ({
      marshaller: {
        toCapData: (specimen: unknown) => ({
          body: `#${JSON.stringify(specimen)}`,
          slots: [],
        }),
      },
      agoricNames: {
        instance: {
          postalService: 'board0371',
        },
      },
    }) as unknown as Awaited<
      ReturnType<typeof import('@agoric/client-utils').makeSmartWalletKit>
    >;
  return { connectRpc, makeWalletKit };
};

test('phase-upgrade-generate reuses an existing privateArgsOverrides asset when privateArgs is blank', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;

  const existingOverridesName = expectedOverridesAssetName(
    'ymax0-main',
    '{"oracle":"value-a"}',
  );
  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
    // A prior attempt materialized overrides but never got as far as the
    // unsigned tx (so there's no upgrade/pending record yet to pin the
    // path via validateExpectedOverridesAsset).
    [existingOverridesName]: canonicalizePrivateArgs('{"oracle":"value-a"}'),
  });

  const { connectRpc, makeWalletKit } = makeAuthzGenerateChainMocks();

  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile: ctx.execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-generate',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: 'agoric1operator0000000000000000000000000000000',
      // A workflow_dispatch optional string input left blank arrives as
      // '', not undefined.
      PRIVATE_ARGS_OVERRIDES: '',
    },
  );

  const assets = ctx.releases.get(releaseTag)?.assets;
  const overridesNames = [...(assets?.keys() ?? [])].filter(name =>
    name.startsWith('ymax0-main-privateArgsOverrides-'),
  );
  t.deepEqual(overridesNames, [existingOverridesName]);
  t.is(
    assets?.get(existingOverridesName),
    canonicalizePrivateArgs('{"oracle":"value-a"}'),
  );
  t.truthy(assets?.get('ymax0-main-authz-unsigned-tx.json'));
});

test('phase-upgrade-generate rejects a conflicting privateArgsOverrides asset instead of adding a second one', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;

  const existingOverridesName = expectedOverridesAssetName(
    'ymax0-main',
    '{"oracle":"value-a"}',
  );
  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
    [existingOverridesName]: canonicalizePrivateArgs('{"oracle":"value-a"}'),
  });

  const { connectRpc, makeWalletKit } = makeAuthzGenerateChainMocks();

  await t.throwsAsync(
    runPhase(
      {
        agoricSdk: ctx.agoricSdk,
        execFile: ctx.execFile,
        fetchFn: ctx.fetchFn,
        connectRpc,
        makeWalletKit,
        stdout: ctx.stdout,
      },
      'phase-upgrade-generate',
      { target: 'ymax0-main', tag: releaseTag },
      {
        ...ctx.env,
        MNEMONIC: undefined,
        GRANTEE: 'agoric1operator0000000000000000000000000000000',
        PRIVATE_ARGS_OVERRIDES: '{"oracle":"value-b"}',
      },
    ),
    {
      message: new RegExp(
        `^${expectedOverridesAssetName('ymax0-main', '{"oracle":"value-b"}').replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')} would be a new private-args-overrides asset for ymax0-main, but ${existingOverridesName.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')} already exists`,
      ),
    },
  );

  const assets = ctx.releases.get(releaseTag)?.assets;
  const overridesNames = [...(assets?.keys() ?? [])].filter(name =>
    name.startsWith('ymax0-main-privateArgsOverrides-'),
  );
  t.deepEqual(overridesNames, [existingOverridesName]);
  t.falsy(assets?.get('ymax0-main-authz-unsigned-tx.json'));
});

test('phase-upgrade-generate is idempotent when privateArgs matches the existing overrides asset', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;

  const existingOverridesName = expectedOverridesAssetName(
    'ymax0-main',
    '{"oracle":"value-a"}',
  );
  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
    [existingOverridesName]: canonicalizePrivateArgs('{"oracle":"value-a"}'),
  });

  const { connectRpc, makeWalletKit } = makeAuthzGenerateChainMocks();

  await t.notThrowsAsync(
    runPhase(
      {
        agoricSdk: ctx.agoricSdk,
        execFile: ctx.execFile,
        fetchFn: ctx.fetchFn,
        connectRpc,
        makeWalletKit,
        stdout: ctx.stdout,
      },
      'phase-upgrade-generate',
      { target: 'ymax0-main', tag: releaseTag },
      {
        ...ctx.env,
        MNEMONIC: undefined,
        GRANTEE: 'agoric1operator0000000000000000000000000000000',
        // Same value as what's already recorded: re-supplying it explicitly
        // must not be treated as a conflicting override.
        PRIVATE_ARGS_OVERRIDES: '{"oracle":"value-a"}',
      },
    ),
  );

  const assets = ctx.releases.get(releaseTag)?.assets;
  const overridesNames = [...(assets?.keys() ?? [])].filter(name =>
    name.startsWith('ymax0-main-privateArgsOverrides-'),
  );
  t.deepEqual(overridesNames, [existingOverridesName]);
  t.truthy(assets?.get('ymax0-main-authz-unsigned-tx.json'));
});

test('phase-upgrade-generate rejects a rerun with a different grantee than the existing unsigned tx', async t => {
  const ctx = makeScenario();
  const releaseTag = happyPathReleaseTag;

  seedRelease(ctx.releases, releaseTag, {
    'bundle-ymax0.json': jsonText(examples.bundle),
    'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
    'ymax0-devnet-upgrade.json': jsonText(examples.upgrade.devnet0),
    'ymax0-main-install.json': jsonText(examples.install.main0),
  });

  // A cryptographically valid (33-byte compressed) key, unlike the 3-byte
  // placeholder most fixtures use, since this test needs to decode it back
  // out to compare against a second run's grantee. The mock returns this
  // same key regardless of the address queried, so the address embedded in
  // the unsigned tx is this key's own derived address, not firstGrantee.
  const mockPubkeyValue = Buffer.from([2, ...Array(32).fill(7)]).toString(
    'base64',
  );
  const embeddedAddress = pubkeyToAddress(
    { type: 'tendermint/PubKeySecp256k1', value: mockPubkeyValue },
    'agoric',
  );
  const { connectRpc, makeWalletKit } =
    makeAuthzGenerateChainMocks(mockPubkeyValue);

  const firstGrantee = 'agoric1operator0000000000000000000000000000000';
  await runPhase(
    {
      agoricSdk: ctx.agoricSdk,
      execFile: ctx.execFile,
      fetchFn: ctx.fetchFn,
      connectRpc,
      makeWalletKit,
      stdout: ctx.stdout,
    },
    'phase-upgrade-generate',
    { target: 'ymax0-main', tag: releaseTag },
    {
      ...ctx.env,
      MNEMONIC: undefined,
      GRANTEE: firstGrantee,
      PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
    },
  );

  const secondGrantee = 'agoric1differentgrantee0000000000000000000000';
  await t.throwsAsync(
    runPhase(
      {
        agoricSdk: ctx.agoricSdk,
        execFile: ctx.execFile,
        fetchFn: ctx.fetchFn,
        connectRpc,
        makeWalletKit,
        stdout: ctx.stdout,
      },
      'phase-upgrade-generate',
      { target: 'ymax0-main', tag: releaseTag },
      {
        ...ctx.env,
        MNEMONIC: undefined,
        GRANTEE: secondGrantee,
        PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}',
      },
    ),
    {
      message: `grantee ${secondGrantee} resolves to ${secondGrantee}, but existing ymax0-main-authz-unsigned-tx.json was generated for grantee ${embeddedAddress}; remove or rename ymax0-main-authz-unsigned-tx.json to change grantee`,
    },
  );
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
      fetchFn: ctx.fetchFn,
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
      fetchFn: ctx.fetchFn,
      stdout: ctx.stdout,
    },
    'phase-upgrade-submit',
    { target: 'ymax1-main', tag: releaseTag },
    { ...ctx.env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}' },
  );

  t.truthy(
    ctx.releases.get(releaseTag)?.assets.has('ymax1-main-upgrade-pending.json'),
  );
  t.false(ctx.releases.get(releaseTag)?.assets.has('ymax1-main-upgrade.json'));
  snapshotPhase(t, {
    label: 'upgrade-submit',
    execs: ctx.execs,
    normalize: ctx.normalize,
    stdoutChunks: ctx.stdoutChunks,
  });
  snapshotAssets(t, {
    normalize: ctx.normalize,
    releases: ctx.releases,
    releaseTag,
  });
});

test('ymax1-main upgrade requires ymax0-main upgrade evidence', async t => {
  const {
    agoricSdk,
    releases,
    execs,
    stdoutChunks,
    stdout,
    env,
    fetchFn,
    execFile,
  } = makeScenario();

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
        fetchFn,
        stdout,
      },
      'phase-upgrade-submit',
      { target: 'ymax1-main', tag: 'v0.3.2604-beta1' },
      { ...env, MNEMONIC: 'not-used' },
    ),
    { message: 'missing required release asset ymax0-main-upgrade.json' },
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

test('phase-upgrade-submit materializes default overrides', async t => {
  const { agoricSdk, files, releases, stdout, normalize, ...other } =
    makeScenario();
  const { env, execs, fetchFn, execFile: baseExecFile } = other;

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
      fetchFn,
      stdout,
    },
    'phase-upgrade-submit',
    { target: 'ymax0-main', tag: 'v0.3.2604-beta1' },
    env,
  );

  const overridesAssets = [
    ...(releases.get('v0.3.2604-beta1')?.assets.entries() ?? []),
  ].filter(([name]) => name.startsWith('ymax0-main-privateArgsOverrides-'));
  t.is(overridesAssets.length, 1);
  t.is(overridesAssets[0]?.[1], '{}\n');
});

test.serial(
  'phase-upgrade-confirm finds authz-submitted upgrades from release artifacts',
  async t => {
    const ctx = makeScenario();
    const releaseTag = happyPathReleaseTag;
    const pending = {
      target: 'ymax0-devnet',
      releaseTag,
      contract: 'ymax0',
      network: 'devnet',
      chainId: 'agoricdev-25',
      bundleId: examples.upgrade.devnet0.bundleId,
      privateArgsOverridesPath: expectedOverridesAssetName('ymax0-devnet', ''),
      invocationId: 'upgrade.ymax0-devnet.2026-07-06T21:59:57.180Z',
      submitTime: '2026-04-16T10:00:00.000Z',
    } as const;
    const grantee = 'agoric1w376w9ws44d7l5cp7g5jjqn45mp5teldt5dhg9';
    const owner = 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv';
    const messageId = 'upgrade.ymax0-devnet.2026-07-06T20:11:53.933Z';
    const authzTx = {
      height: `${examples.upgrade.devnet0.upgradeBlockHeight}`,
      txhash: examples.upgrade.devnet0.upgradeTxHash,
      code: 0,
      timestamp: examples.upgrade.devnet0.upgradeBlockTime,
      tx: {
        body: {
          messages: [
            {
              '@type': '/cosmos.authz.v1beta1.MsgExec',
              grantee,
              msgs: [
                {
                  '@type': '/agoric.swingset.MsgWalletSpendAction',
                  owner,
                  spend_action: JSON.stringify({
                    body: `#${JSON.stringify({
                      method: 'invokeEntry',
                      message: {
                        id: messageId,
                        method: 'upgrade',
                        args: [{ bundleId: pending.bundleId }],
                      },
                    })}`,
                  }),
                },
              ],
            },
          ],
        },
      },
    };

    const { execFile: baseExecFile } = ctx;
    const execFile = async (
      cmd: string,
      args: string[],
      opts?: Parameters<typeof baseExecFile>[2],
      ...rest: unknown[]
    ) => {
      const logResult = fakeUpgradeLogs(
        ctx.execs,
        ctx.normalize,
        cmd,
        args,
        opts,
        {
          contract: 'ymax0',
          bundleId: pending.bundleId,
          incarnationNumber: examples.upgrade.devnet0.incarnationNumber,
        },
      );
      if (logResult) {
        return logResult;
      }
      return baseExecFile(cmd, args, opts, ...rest);
    };

    const fetchFn = async (url: string) => {
      if (url.endsWith('/network-config')) {
        return ctx.fetchFn(url);
      }
      const jsonRes = (data: unknown) =>
        ({
          ok: true,
          status: 200,
          json: async () => data,
          text: async () => JSON.stringify(data),
        }) as Response;
      if (url.includes('/cosmos/tx/v1beta1/txs?')) {
        const query = new URL(url).searchParams.get('query');
        return jsonRes({
          tx_responses:
            query === `message.sender='${grantee}'` ? [authzTx] : [],
        });
      }
      if (url.includes('/cosmos/tx/v1beta1/txs/')) {
        return jsonRes({ tx_response: authzTx });
      }
      if (url.includes(`/agoric/vstorage/data/published.wallet.${owner}`)) {
        const update = {
          body: `#${JSON.stringify({
            updated: 'invocation',
            id: messageId,
            result: {
              incarnationNumber: examples.upgrade.devnet0.incarnationNumber,
            },
          })}`,
          slots: [],
        };
        return jsonRes({
          value: JSON.stringify({
            blockHeight: `${examples.upgrade.devnet0.upgradeBlockHeight}`,
            values: [JSON.stringify(update)],
          }),
        });
      }
      if (url.includes('/cosmos/base/tendermint/v1beta1/blocks/')) {
        const height = Number(url.split('/').pop());
        return jsonRes({
          block_id: {
            hash: Buffer.from(`block-hash-${height}`).toString('base64'),
          },
          block: {
            header: {
              height: `${height}`,
              time: new Date(height * 1000).toISOString(),
            },
          },
        });
      }
      throw Error(`unexpected fetch url: ${url}`);
    };

    seedRelease(ctx.releases, releaseTag, {
      'bundle-ymax0.json': jsonText(examples.bundle),
      'ymax0-devnet-install.json': jsonText(examples.install.devnet0),
      'ymax0-devnet-upgrade-pending.json': jsonText(pending),
      'ymax0-devnet-authz-signed-tx.json': jsonText({
        body: {
          messages: [
            {
              '@type': '/cosmos.authz.v1beta1.MsgExec',
              grantee,
              msgs: [],
            },
          ],
        },
      }),
    });

    await runPhase(
      {
        agoricSdk: ctx.agoricSdk,
        execFile,
        fetchFn,
        stdout: ctx.stdout,
      },
      'phase-upgrade-confirm',
      { target: 'ymax0-devnet', tag: releaseTag },
      { ...ctx.env, AGORIC_NET: 'devnet', GRANTEE: undefined },
    );

    const written = ctx.releases
      .get(releaseTag)
      ?.assets.get('ymax0-devnet-upgrade.json');
    t.truthy(written);
    t.like(JSON.parse(written || '{}'), {
      target: 'ymax0-devnet',
      upgradeTxHash: examples.upgrade.devnet0.upgradeTxHash,
      incarnationNumber: examples.upgrade.devnet0.incarnationNumber,
    });
  },
);

test.serial(
  'confirm fails fast when the upgrade invocation errored',
  async t => {
    const ctx = makeScenario();
    const releaseTag = happyPathReleaseTag;
    const { execFile: baseExecFile, files } = ctx;

    const execFile = async (
      cmd: string,
      args: string[],
      opts?: Parameters<typeof baseExecFile>[2],
      ...rest: unknown[]
    ) => {
      if (
        cmd.endsWith('/wallet-admin.ts') &&
        args[0] === './packages/portfolio-deploy/src/ymax-upgrade.ts'
      ) {
        const resultFile = args[args.indexOf('--result-file') + 1];
        files.set(resultFile, '{}\n');
        return { stdout: '' };
      }
      return baseExecFile(cmd, args, opts, ...rest);
    };

    // Serve an `invocation` update carrying the interface-guard error that a
    // landed-but-rejected upgrade produces (the tx code is still 0).
    const invocationError =
      'In "upgrade" method of (ContractControl): arg 0: (an object) - Must match one of (a string)';
    const messageId = `upgrade.${examples.upgrade.main0.upgradeBlockTime}`;
    const fetchFn = async (url: string) => {
      if (url.includes('/agoric/vstorage/data/published.wallet.')) {
        const update = {
          body: `#${JSON.stringify({
            updated: 'invocation',
            id: messageId,
            error: invocationError,
          })}`,
          slots: [],
        };
        const data = {
          value: JSON.stringify({
            blockHeight: '78',
            values: [JSON.stringify(update)],
          }),
        };
        return {
          ok: true,
          status: 200,
          json: async () => data,
          text: async () => JSON.stringify(data),
        } as Response;
      }
      return ctx.fetchFn(url);
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
      { agoricSdk: ctx.agoricSdk, execFile, fetchFn, stdout: ctx.stdout },
      'phase-upgrade-submit',
      { target: 'ymax1-main', tag: releaseTag },
      { ...ctx.env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}' },
    );
    const err = await t.throwsAsync(
      runPhase(
        { agoricSdk: ctx.agoricSdk, execFile, fetchFn, stdout: ctx.stdout },
        'phase-upgrade-confirm',
        { target: 'ymax1-main', tag: releaseTag },
        { ...ctx.env, PRIVATE_ARGS_OVERRIDES: '{"oracle":"value"}' },
      ),
    );
    t.true(err?.message.includes('failed on chain'), err?.message);
    t.true(err?.message.includes(invocationError), err?.message);
    t.false(
      ctx.releases.get(releaseTag)?.assets.has('ymax1-main-upgrade.json') ??
        false,
      'no upgrade record is written for a failed invocation',
    );
  },
);

// phase-upgrade-generate still reuses an existing ${target}-authz-unsigned-tx.json without checking that the paired ${target}-upgrade-pending.json exists or still matches. So if the unsigned tx remains in the release but the pending artifact is deleted or corrupted, phase-upgrade-generate can still report success based only on the unsigned-tx asset.
test.todo(
  'phase-upgrade-generate should ensure pending artifact exists and matches unsigned tx',
);
