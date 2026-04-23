#!/usr/bin/env node
/**
 * @file plan ymax release work before any expensive build steps
 *
 * Intentionally duplicates validation and naming logic from
 * packages/portfolio-deploy/scripts/ymax-deploy-target.ts so it can run
 * before any agoric-sdk build step.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

const targetInfo = {
  'ymax0-devnet': {
    contract: 'ymax0',
    network: 'devnet',
    chainId: 'agoricdev-25',
  },
  'ymax0-main': {
    contract: 'ymax0',
    network: 'main',
    chainId: 'agoric-3',
  },
  'ymax1-main': {
    contract: 'ymax1',
    network: 'main',
    chainId: 'agoric-3',
  },
};

const prerequisiteTargets = {
  'ymax0-devnet': [],
  'ymax0-main': ['ymax0-devnet'],
  'ymax1-main': ['ymax0-main'],
};

const toOutputName = name =>
  name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const canonicalizePrivateArgs = specimen => {
  const overrides = specimen ? JSON.parse(specimen) : {};
  return `${JSON.stringify(overrides, null, 2)}\n`;
};

const expectedOverridesAssetName = (target, specimen) => {
  const text = canonicalizePrivateArgs(specimen);
  const digest = createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `${target}-privateArgsOverrides-${digest}.json`;
};

const bundleIdFromBundleText = text => {
  const bundle = JSON.parse(text);
  if (!bundle.endoZipBase64Sha512) {
    throw Error('bundle-ymax0.json missing endoZipBase64Sha512');
  }
  return `b1-${bundle.endoZipBase64Sha512}`;
};

const validateBaseRecord = (target, bundleId, record) => {
  const expected = {
    target,
    ...targetInfo[target],
    bundleId,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (record[key] !== value) {
      throw Error(`expected ${key}=${value}, got ${String(record[key])}`);
    }
  }
};

const validateInstallRecord = (target, bundleId, record) => {
  validateBaseRecord(target, bundleId, record);
  if (record.confirmedInBundles !== true) {
    throw Error('confirmedInBundles must be true');
  }
};

const validateUpgradeRecord = (target, bundleId, record) => {
  validateBaseRecord(target, bundleId, record);
  if (
    typeof record.incarnationNumber !== 'number' ||
    !Array.isArray(record.healthBlocks) ||
    record.healthBlocks.length !== 3 ||
    !record.privateArgsOverridesPath
  ) {
    throw Error('invalid upgrade record');
  }
};

const makeReleaseReader = ({ gh, releaseTag }) => {
  const release = (() => {
    const proc = gh(['release', 'view', releaseTag, '--json', 'assets,url'], {
      allowFailure: true,
    });
    if (proc.status !== 0) {
      return { assets: [], url: '' };
    }
    return JSON.parse(proc.stdout || '{}');
  })();

  const assetNames = new Set(release.assets.map(({ name }) => name));
  const assetTextCache = new Map();

  const getAssetText = name => {
    if (!assetNames.has(name)) {
      throw Error(`missing required release asset ${name}`);
    }
    if (!assetTextCache.has(name)) {
      const proc = gh(
        ['release', 'download', releaseTag, '--pattern', name, '--output', '-'],
        { encoding: 'utf8' },
      );
      assetTextCache.set(name, proc.stdout);
    }
    return assetTextCache.get(name);
  };

  const getAssetJson = name => JSON.parse(getAssetText(name));

  return { assetNames, getAssetJson, getAssetText, release };
};

const makePlan = ({
  bundleIdArg,
  mode,
  privateArgs,
  releaseTag,
  target,
  ymax1Planner,
  gh,
}) => {
  if (!(target in targetInfo)) throw Error(`unsupported target: ${target}`);
  if (!['bundle-only', 'deploy'].includes(mode)) {
    throw Error(`unsupported --mode: ${mode}`);
  }

  const { assetNames, getAssetJson, getAssetText, release } = makeReleaseReader(
    {
      gh,
      releaseTag,
    },
  );
  const needBundleBuild =
    target === 'ymax0-devnet' && !assetNames.has('bundle-ymax0.json');
  const bundleId =
    bundleIdArg ||
    (assetNames.has('bundle-ymax0.json')
      ? bundleIdFromBundleText(getAssetText('bundle-ymax0.json'))
      : '');

  const plan = {
    mode,
    target,
    releaseTag,
    releaseExists: Boolean(release.url),
    bundleId,
    needBundleBuild,
    needPreUpgrade: true,
    needUpgrade: true,
  };

  if (mode === 'bundle-only') {
    return plan;
  }

  if (!bundleId) {
    throw Error(
      `bundle id unavailable for ${target}; build or upload bundle-ymax0.json first`,
    );
  }

  for (const priorTarget of prerequisiteTargets[target]) {
    validateInstallRecord(
      priorTarget,
      bundleId,
      getAssetJson(`${priorTarget}-install.json`),
    );
    validateUpgradeRecord(
      priorTarget,
      bundleId,
      getAssetJson(`${priorTarget}-upgrade.json`),
    );
  }

  const installAssetName = `${target}-install.json`;
  if (assetNames.has(installAssetName)) {
    validateInstallRecord(target, bundleId, getAssetJson(installAssetName));
    plan.needPreUpgrade = false;
  }

  const upgradeAssetName = `${target}-upgrade.json`;
  if (assetNames.has(upgradeAssetName)) {
    const record = getAssetJson(upgradeAssetName);
    validateUpgradeRecord(target, bundleId, record);
    const expectedOverrides = expectedOverridesAssetName(target, privateArgs);
    if (record.privateArgsOverridesPath !== expectedOverrides) {
      throw Error(
        `existing ${upgradeAssetName} uses ${record.privateArgsOverridesPath}, not ${expectedOverrides}; remove or rename ${upgradeAssetName} to change private args`,
      );
    }
    plan.needUpgrade = false;
  }

  if (target === 'ymax1-main' && plan.needUpgrade && ymax1Planner !== 'down') {
    throw Error('ymax1Planner must be down for ymax1-main');
  }

  return plan;
};

const makeGh =
  ({ env, spawn }) =>
  (args, { allowFailure = false, encoding = 'utf8' } = {}) => {
    const proc = spawn('gh', args, { encoding, env });
    if (proc.status === 0 || allowFailure) {
      return proc;
    }
    throw Error(
      [`gh ${args.join(' ')}`, proc.stderr, proc.stdout]
        .filter(Boolean)
        .join('\n'),
    );
  };

const writePlanOutputs = ({ plan, writeOutput }) => {
  for (const [key, value] of Object.entries(plan)) {
    writeOutput(toOutputName(key), String(value));
  }
};

const fail = message => {
  throw Error(message);
};

export const main = async ({
  env = process.env,
  appendFile = appendFileSync,
  spawn = spawnSync,
  stdout = process.stdout,
} = {}) => {
  const mode = env.MODE || 'deploy';
  const releaseTag = env.RELEASE_TAG || fail('--release-tag missing');
  const target = env.TARGET || fail('--target missing');
  const gh = makeGh({ env, spawn });
  const plan = makePlan({
    bundleIdArg: env.BUNDLE_ID || '',
    mode,
    privateArgs: env.PRIVATE_ARGS_OVERRIDES || '',
    releaseTag,
    target,
    ymax1Planner: env.YMAX1_PLANNER || '',
    gh,
  });

  const writeOutput = (name, value) => {
    if (!env.GITHUB_OUTPUT) return;
    appendFile(env.GITHUB_OUTPUT, `${name}=${value}\n`);
  };
  writePlanOutputs({ plan, writeOutput });
  stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
};

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
